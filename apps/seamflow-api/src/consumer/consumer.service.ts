import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  orderClaims,
  orders,
  orderItems,
  orderEvents,
  orderPhotos,
  tailors,
  measurementSets,
} from '../db/schema';
import { ShareLinksService } from '../share-links/share-links.service';
import { OrderPhotosService } from '../order-photos/order-photos.service';

@Injectable()
export class ConsumerService {
  constructor(
    private readonly dbService: DbService,
    private readonly shareLinks: ShareLinksService,
    private readonly orderPhotos: OrderPhotosService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  /**
   * Claim an order from its share-link token. resolvePublic() does all the
   * validation (unknown / expired / delivered+2d). We then record the claim so
   * it shows in this user's inbox. Idempotent (re-claiming is a no-op).
   */
  async claim(userId: string, token: string) {
    const payload = await this.shareLinks.resolvePublic(token);
    const order = payload.order;
    await this.db
      .insert(orderClaims)
      .values({ userId, orderId: order.id, tailorId: order.tailorId })
      .onConflictDoNothing();
    const thumb = payload.photos[0];
    return {
      id: order.id,
      orderName: order.orderName,
      status: order.status,
      dateOrdered: order.dateOrdered,
      dateDelivery: order.dateDelivery,
      tailorBusinessName: payload.tailor.businessName,
      thumbnailUrl: thumb?.thumbnailUrl ?? thumb?.signedUrl,
      claimedAt: new Date(),
    };
  }

  /** Every order this user has claimed, newest first, with tailor + a thumb. */
  async listOrders(userId: string) {
    const rows = await this.db
      .select({
        order: orders,
        tailorName: tailors.businessName,
        claimedAt: orderClaims.createdAt,
      })
      .from(orderClaims)
      .innerJoin(orders, eq(orders.id, orderClaims.orderId))
      .innerJoin(tailors, eq(tailors.id, orderClaims.tailorId))
      .where(eq(orderClaims.userId, userId))
      .orderBy(desc(orderClaims.createdAt));

    return Promise.all(
      rows.map(async (r) => {
        const [photo] = await this.db
          .select()
          .from(orderPhotos)
          .where(eq(orderPhotos.orderId, r.order.id))
          .orderBy(desc(orderPhotos.createdAt))
          .limit(1);
        const signed = photo ? await this.orderPhotos.attachSignedUrl(photo) : undefined;
        return {
          id: r.order.id,
          orderName: r.order.orderName,
          status: r.order.status,
          dateOrdered: r.order.dateOrdered,
          dateDelivery: r.order.dateDelivery,
          tailorBusinessName: r.tailorName,
          thumbnailUrl: signed?.thumbnailUrl ?? signed?.signedUrl,
          claimedAt: r.claimedAt,
        };
      }),
    );
  }

  /** Full detail for a claimed order (verifies the claim belongs to this user). */
  async getOrder(userId: string, orderId: string) {
    const claim = await this.db
      .select({ id: orderClaims.id })
      .from(orderClaims)
      .where(and(eq(orderClaims.userId, userId), eq(orderClaims.orderId, orderId)))
      .limit(1);
    if (!claim[0]) throw new NotFoundException(`Order ${orderId} not found`);

    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const events = await this.db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId))
      .orderBy(desc(orderEvents.createdAt))
      .limit(100);

    const photoRows = await this.db
      .select()
      .from(orderPhotos)
      .where(eq(orderPhotos.orderId, orderId))
      .orderBy(desc(orderPhotos.createdAt));
    const photos = await Promise.all(
      photoRows.map((p) => this.orderPhotos.attachSignedUrl(p)),
    );

    const [tailor] = await this.db
      .select({ businessName: tailors.businessName, location: tailors.location })
      .from(tailors)
      .where(eq(tailors.id, order.tailorId))
      .limit(1);

    return {
      order,
      items,
      photos,
      events,
      tailor: tailor ?? { businessName: 'Tailor', location: null },
    };
  }

  /**
   * The user's measurement locker: every measurement set on the client records
   * tied to their claimed orders, tagged with the tailor that holds it.
   */
  async listMeasurements(userId: string) {
    const claimed = await this.db
      .select({ clientId: orders.clientId, tailorName: tailors.businessName })
      .from(orderClaims)
      .innerJoin(orders, eq(orders.id, orderClaims.orderId))
      .innerJoin(tailors, eq(tailors.id, orderClaims.tailorId))
      .where(eq(orderClaims.userId, userId));

    const clientTailor = new Map<string, string>();
    for (const c of claimed) {
      if (!clientTailor.has(c.clientId)) clientTailor.set(c.clientId, c.tailorName);
    }
    const clientIds = [...clientTailor.keys()];
    if (clientIds.length === 0) return [];

    const sets = await this.db
      .select()
      .from(measurementSets)
      .where(inArray(measurementSets.clientId, clientIds))
      .orderBy(desc(measurementSets.createdAt));

    return sets.map((s) => ({
      ...s,
      tailorBusinessName: clientTailor.get(s.clientId) ?? 'Tailor',
    }));
  }
}
