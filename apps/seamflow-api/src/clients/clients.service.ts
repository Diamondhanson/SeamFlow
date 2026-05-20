import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { clients } from '../db/schema';
import type {
  ClientCreateInput,
  ClientUpdateInput,
} from '@seamflow/schemas';

export type ClientRow = typeof clients.$inferSelect;

interface ListOptions {
  limit: number;
  offset: number;
  q?: string;
}

@Injectable()
export class ClientsService {
  constructor(private readonly dbService: DbService) {}

  async list(tailorId: string, opts: ListOptions): Promise<ClientRow[]> {
    const filters = [eq(clients.tailorId, tailorId)];
    if (opts.q) {
      const pattern = `%${opts.q}%`;
      filters.push(
        or(ilike(clients.fullName, pattern), ilike(clients.phone, pattern))!,
      );
    }
    return this.dbService.db
      .select()
      .from(clients)
      .where(and(...filters))
      .orderBy(desc(clients.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  async getById(tailorId: string, id: string): Promise<ClientRow> {
    const rows = await this.dbService.db
      .select()
      .from(clients)
      .where(and(eq(clients.tailorId, tailorId), eq(clients.id, id)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`Client ${id} not found`);
    return row;
  }

  async create(tailorId: string, data: ClientCreateInput): Promise<ClientRow> {
    const rows = await this.dbService.db
      .insert(clients)
      .values({
        tailorId,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        email: data.email ?? null,
        notes: data.notes ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Client insert returned no row');
    return row;
  }

  async update(
    tailorId: string,
    id: string,
    data: ClientUpdateInput,
  ): Promise<ClientRow> {
    await this.getById(tailorId, id);

    const patch: Partial<typeof clients.$inferInsert> = { updatedAt: new Date() };
    if (data.fullName !== undefined) patch.fullName = data.fullName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.address !== undefined) patch.address = data.address;
    if (data.email !== undefined) patch.email = data.email;
    if (data.notes !== undefined) patch.notes = data.notes;

    const rows = await this.dbService.db
      .update(clients)
      .set(patch)
      .where(and(eq(clients.tailorId, tailorId), eq(clients.id, id)))
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException(`Client ${id} not found`);
    return row;
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    try {
      await this.dbService.db
        .delete(clients)
        .where(and(eq(clients.tailorId, tailorId), eq(clients.id, id)));
    } catch (err) {
      if (
        err instanceof Error &&
        /violates foreign key constraint/i.test(err.message)
      ) {
        throw new ConflictException(
          'Client has orders — delete or reassign them first',
        );
      }
      throw err;
    }
  }
}
