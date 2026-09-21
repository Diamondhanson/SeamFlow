-- ============================================================================
-- Accent-insensitive search.
--
-- Discover's search is used mostly in French. A customer typing "mariee" on a
-- phone keyboard without accents must still find "Robe de mariée", and one
-- typing "brodée" must find a caption that says "brodee". Plain regex matching
-- compares code points, so the two never meet — verified: 'mariée' ~* 'mariee'
-- is false.
--
-- unaccent() folds both sides to bare letters before comparing. It is STABLE
-- rather than IMMUTABLE, so it cannot sit in an index expression as-is; that
-- is fine at today's catalogue size, and the tsvector index that replaces this
-- at scale will want its own immutable wrapper anyway.
-- ============================================================================

create extension if not exists unaccent;
