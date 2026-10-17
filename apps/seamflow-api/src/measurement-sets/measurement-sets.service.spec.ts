// A measurement set cites the template it was taken against, and that template
// has to be the tailor's own: `templateId` is compared elsewhere to decide
// whether a saved set matches the garment being made, so a foreign id does not
// just sit there — it participates in a decision.

import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MeasurementSetsService } from './measurement-sets.service';
import { fakeDbQueue } from '../../test/fakes';

const TAILOR = 'tailor-1';
const MINE = [{ id: 'ok' }];
const NOT_MINE: never[] = [];

function service(queue: unknown[][]) {
  const db = fakeDbQueue(queue);
  return { svc: new MeasurementSetsService(db.service as never), db };
}

describe('MeasurementSetsService — templateId ownership', () => {
  it('refuses to create a set against another tailor’s template', async () => {
    // client owned → template NOT owned
    const { svc, db } = service([MINE, NOT_MINE]);
    await expect(
      svc.createForClient(TAILOR, 'client-1', {
        values: { chest: 100 },
        templateId: 'not-mine',
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(db.calls).not.toContain('insert');
  });

  it('refuses to re-point an existing set at another tailor’s template', async () => {
    const owned = [{ set: { id: 'set-1' }, clientTailorId: TAILOR }];
    const { svc, db } = service([owned, NOT_MINE]);
    await expect(
      svc.update(TAILOR, 'set-1', { templateId: 'not-mine' } as never),
    ).rejects.toThrow(BadRequestException);
    expect(db.calls).not.toContain('update');
  });

  it('still accepts a set with no template at all', async () => {
    // A set taken freehand is a real and common case — the check must not
    // turn "no template" into an error.
    const { svc } = service([MINE, [{ id: 'set-1' }]]);
    await expect(
      svc.createForClient(TAILOR, 'client-1', { values: { chest: 100 } } as never),
    ).resolves.toBeTruthy();
  });
});
