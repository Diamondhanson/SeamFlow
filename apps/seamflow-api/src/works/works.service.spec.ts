// Publishing a design already refused images outside the tailor's own storage
// prefix — "one bad path in a list of four is still theft". The order backlink
// beside it was unchecked, and it is returned on the work, so a foreign order
// id could end up on a public storefront row.

import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorksService } from './works.service';
import { fakeDbQueue, fakeTxDb } from '../../test/fakes';

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

describe('WorksService.publish — re-publishing cannot strand a live design', () => {
  // syncPublicImages tears the OLD public copies down before making the new
  // ones. The first-publish path handles a failure there by deleting the post
  // it just created; the re-publish path had no protection at all, so a storage
  // error left a design live on Discover with no images and nothing watching.

  const WORK = { id: 'work-1', tailorId: TAILOR, title: 'Gown', description: null };
  const POST = { id: 'post-1', workId: 'work-1', status: 'published' };

  function service(queue: unknown[][]) {
    const db = fakeTxDb({ queue });
    return { svc: new WorksService(db.service as never, {} as never), db };
  }

  it('hides the post rather than leaving it live and empty', async () => {
    const { svc, db } = service([
      [WORK], // requireOwned
      [POST], // postFor — this design is already published
      [], // syncPublicImages: no old public copies to tear down
      [], // the design's images — EMPTY, so syncPublicImages throws
      [], // (imagesFor makes a second read; empty keeps the design photo-less)
    ]);

    await expect(
      svc.publish(TAILOR, 'work-1', {} as never),
    ).rejects.toThrow(/no photos/i);

    // The recovery: taken out of the feed, so nobody browsing Discover sees a
    // design with nothing in it.
    expect(db.committed).toContain('update');
  });

  it('lets the real error reach the tailor instead of failing silently', async () => {
    // Hiding the post is damage control, not a success. The caller has to be
    // told, or they will think it published.
    const { svc } = service([[WORK], [POST], [], [], []]);
    await expect(svc.publish(TAILOR, 'work-1', {} as never)).rejects.toThrow();
  });
});
