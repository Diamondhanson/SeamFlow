import {
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { groupOrders, orderEvents, orderItems, orderPhotos, orders, tailors } from '../db/schema';
import { OrderPhotosService } from '../order-photos/order-photos.service';
import { FabricsService } from '../fabrics/fabrics.service';
import type { OrderFabric } from '@seamflow/schemas';

// ============================================================================
// Share-link token rules
//
// - Default TTL: 60 days from issue. Hard cap baked into the JWT `exp`.
// - Soft expiry: if the order's status is `delivered` and the delivery
//   happened more than 2 days ago, the link rejects regardless of `exp`.
//   This stops links from sitting around publicly long after the work is done.
// - JWT secret is separate from Supabase auth so rotating one doesn't blow
//   up the other.
// ============================================================================

const DEFAULT_TTL_DAYS = 60;
const POST_DELIVERY_GRACE_MS = 2 * 24 * 60 * 60 * 1000;
const TOKEN_ISSUER = 'seamflow:share-link';

interface SharePayload {
  /** Order id baked into the token */
  oid: string;
  /** Tailor id at issue time (sanity check on verify) */
  tid: string;
  iat: number;
  exp: number;
  iss: string;
}

export interface IssuedShareLink {
  url: string;
  token: string;
  expiresAt: string;
}

export interface PublicOrderPayload {
  order: typeof orders.$inferSelect;
  items: (typeof orderItems.$inferSelect)[];
  photos: Array<typeof orderPhotos.$inferSelect & { signedUrl?: string; thumbnailUrl?: string }>;
  /** The order's fabric (its own, or its group's shared fabric) — null if none. */
  fabric: OrderFabric | null;
  tailor: { businessName: string; location: string | null };
  /** When this link will stop working (whichever is sooner: token exp or delivery+2d). */
  effectiveExpiresAt: string;
}

@Injectable()
export class ShareLinksService {
  private readonly logger = new Logger(ShareLinksService.name);
  private readonly secret: string;
  private readonly webBaseUrl: string;

  constructor(
    config: ConfigService,
    private readonly dbService: DbService,
    private readonly photosService: OrderPhotosService,
    private readonly fabricsService: FabricsService,
  ) {
    this.secret = config.getOrThrow<string>('SHARE_LINK_JWT_SECRET');
    this.webBaseUrl = config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000';
  }

  /** Tailor calls this to mint a fresh share link for one of their orders. */
  async issue(tailorId: string, orderId: string): Promise<IssuedShareLink> {
    // Belt-and-suspenders: confirm ownership before signing.
    const [order] = await this.dbService.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, orderId)))
      .limit(1);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + DEFAULT_TTL_DAYS * 24 * 60 * 60;
    const token = jwt.sign(
      { oid: orderId, tid: tailorId } satisfies Omit<SharePayload, 'iat' | 'exp' | 'iss'>,
      this.secret,
      { expiresIn: `${DEFAULT_TTL_DAYS}d`, issuer: TOKEN_ISSUER },
    );

    return {
      url: `${this.webBaseUrl.replace(/\/$/, '')}/o/${token}`,
      token,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  /**
   * Public — anyone with the token can call this. We:
   *   1. Verify the JWT signature + standard `exp`
   *   2. Load the order
   *   3. Reject if the order was delivered >2 days ago
   *   4. Return order + items + photos (with signed image URLs) + tailor brand info
   */
  async resolvePublic(token: string): Promise<PublicOrderPayload> {
    let payload: SharePayload;
    try {
      payload = jwt.verify(token, this.secret, {
        issuer: TOKEN_ISSUER,
      }) as SharePayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new GoneException('This link has expired');
      }
      throw new UnauthorizedException('Invalid share link');
    }

    // Hard query — bypass RLS via service-role since this endpoint is public.
    const [order] = await this.dbService.db
      .select()
      .from(orders)
      .where(eq(orders.id, payload.oid))
      .limit(1);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.tailorId !== payload.tid) {
      // Order has been moved to a different tailor (shouldn't happen in
      // practice) OR the token was tampered. Either way, reject.
      this.logger.warn(`Token tailor mismatch: tok=${payload.tid} actual=${order.tailorId}`);
      throw new UnauthorizedException('Invalid share link');
    }

    let effectiveExpires = new Date(payload.exp * 1000);

    if (order.status === 'delivered') {
      const [latestDelivery] = await this.dbService.db
        .select({ createdAt: orderEvents.createdAt })
        .from(orderEvents)
        .where(
          and(
            eq(orderEvents.orderId, order.id),
            eq(orderEvents.eventType, 'status_change'),
            eq(orderEvents.toStatus, 'delivered'),
          ),
        )
        .orderBy(desc(orderEvents.createdAt))
        .limit(1);
      if (latestDelivery) {
        const postDelivery = new Date(
          latestDelivery.createdAt.getTime() + POST_DELIVERY_GRACE_MS,
        );
        if (Date.now() > postDelivery.getTime()) {
          throw new GoneException('This order was delivered — the link has expired');
        }
        // The effective expiry is the sooner of token-exp and delivery+2d.
        if (postDelivery < effectiveExpires) effectiveExpires = postDelivery;
      }
    }

    const [items, photoRows, tailorRows] = await Promise.all([
      this.dbService.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id)),
      this.dbService.db
        .select()
        .from(orderPhotos)
        .where(eq(orderPhotos.orderId, order.id))
        .orderBy(desc(orderPhotos.createdAt)),
      this.dbService.db
        .select({ businessName: tailors.businessName, location: tailors.location })
        .from(tailors)
        .where(eq(tailors.id, order.tailorId))
        .limit(1),
    ]);

    // Sign photo URLs for public display (~1h TTL).
    const photos = await Promise.all(
      photoRows.map((p) => this.photosService.attachSignedUrl(p)),
    );

    const fabric = await this.resolveOrderFabric(order);

    return {
      order,
      items,
      photos,
      fabric,
      tailor: tailorRows[0] ?? { businessName: 'Tailor', location: null },
      effectiveExpiresAt: effectiveExpires.toISOString(),
    };
  }

  /** The order's own fabric, or its group's shared fabric — null if none. */
  private async resolveOrderFabric(
    order: typeof orders.$inferSelect,
  ): Promise<OrderFabric | null> {
    let fabricId = order.fabricId;
    if (!fabricId && order.groupOrderId) {
      const [group] = await this.dbService.db
        .select({ sharedFabricId: groupOrders.sharedFabricId })
        .from(groupOrders)
        .where(eq(groupOrders.id, order.groupOrderId))
        .limit(1);
      fabricId = group?.sharedFabricId ?? null;
    }
    if (!fabricId) return null;
    const row = await this.fabricsService.findByIdRaw(fabricId);
    return row ? this.fabricsService.toOrderFabric(row) : null;
  }
}
