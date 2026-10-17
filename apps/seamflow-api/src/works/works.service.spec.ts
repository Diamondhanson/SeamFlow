// Publishing a design already refused images outside the tailor's own storage
// prefix — "one bad path in a list of four is still theft". The order backlink
// beside it was unchecked, and it is returned on the work, so a foreign order
// id could end up on a public storefront row.

import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorksService } from './works.service';
import { fakeDbQueue } from '../../test/fakes';

const TAILOR = 'tailor-1';
const NOT_MINE: never[] = [];

function service(queue: unknown[][]) {
  const db = fakeDbQueue(queue);
  return {
    svc: new WorksService(db.service as never, {} as never),
    db,
  };
}

const ownImage = { storagePath: `${TAILOR}/photo.webp`, thumbnailPath: `${TAILOR}/thumb.webp` };

describe('WorksService.create — what a design may point at', () => {
  it('refuses an order that belongs to another tailor', async () => {
    const { svc, db } = service([NOT_MINE]);
    await expect(
      svc.create(TAILOR, { images: [ownImage], orderId: 'someone-elses-order' } as never),
    ).rejects.toThrow(BadRequestException);
    expect(db.calls).not.toContain('insert');
  });

  it('still refuses an image outside the tailor’s own prefix', async () => {
    // The pre-existing guard, pinned so the new check cannot be added in a way
    // that reorders it past this one.
    const { svc, db } = service([]);
    await expect(
      svc.create(TAILOR, {
        images: [{ storagePath: 'other-tailor/photo.webp' }],
        orderId: null,
      } as never),
    ).rejects.toThrow(NotFoundException);
    expect(db.calls).not.toContain('insert');
  });

  it('checks the images before it ever asks the database about the order', async () => {
    // A bad path must fail without a query — otherwise a crafted request is a
    // free order-existence probe.
    const { svc, db } = service([]);
    await expect(
      svc.create(TAILOR, {
        images: [{ storagePath: 'other-tailor/photo.webp' }],
        orderId: 'probe-this-id',
      } as never),
    ).rejects.toThrow(NotFoundException);
    expect(db.calls).toHaveLength(0);
  });
});
