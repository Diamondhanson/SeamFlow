// Saving the same client twice in a row must give one client.
//
// Testers pressed Save, saw nothing change, pressed again — and had two copies.
// The app now guards the button; this is the server's half, because a slow
// connection or a retried queued request can deliver the same save twice too.

import { describe, expect, it } from 'vitest';
import { ClientsService } from './clients.service';
import { fakeDbQueue } from '../../test/fakes';

const TAILOR = 'tailor-1';
const input = { fullName: 'Ada Okoro', phone: '+237670000000', address: 'Bonanjo, Douala' };
const row = (id: string) => ({ id, tailorId: TAILOR, ...input, email: null, notes: null });

describe('ClientsService.create — pressed twice', () => {
  it('returns the client that was just saved instead of making another', async () => {
    const db = fakeDbQueue([[row('existing')]]);
    const svc = new ClientsService(db.service as never);
    const out = await svc.create(TAILOR, input as never);
    expect(out.id).toBe('existing');
    expect(db.calls).not.toContain('insert');
  });

  it('creates the client when there is no identical one just now', async () => {
    const db = fakeDbQueue([[], [row('new')]]);
    const svc = new ClientsService(db.service as never);
    const out = await svc.create(TAILOR, input as never);
    expect(out.id).toBe('new');
    expect(db.calls).toContain('insert');
  });
});
