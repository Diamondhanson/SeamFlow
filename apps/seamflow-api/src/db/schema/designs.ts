import { pgTable, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { tailors } from './users';

// Inspiration library ("moodboard"). Tailor-scoped images saved for reference.
// Pixels live in the private `designs` Supabase Storage bucket under
// <tailor_id>/designs/<uuid>.<ext>. See migration 20260703130000.
export const designs = pgTable(
  'designs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    // 'uploaded' now; 'generated' reserved for AI generation (M4).
    source: text('source').notNull().default('uploaded'),
    storagePath: text('storage_path').notNull(),
    thumbnailPath: text('thumbnail_path'),
    contentType: text('content_type'),
    caption: text('caption'),
    tags: jsonb('tags').notNull().default([]),
    // Last accepted AI description (M3).
    aiNotes: text('ai_notes'),
    // Generation prompt (M4, future).
    prompt: text('prompt'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdIdx: index('designs_tailor_id_idx').on(t.tailorId),
  }),
);
