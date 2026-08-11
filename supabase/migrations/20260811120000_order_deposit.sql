-- ============================================================================
-- orders.deposit — money taken up front, recorded on the ORDER.
--
-- Until now a deposit could only live on an invoice. That is the wrong moment:
-- a tailor takes the deposit when the job is agreed, which is often days before
-- anyone thinks about an invoice, and the invoice is 1:1 with the order anyway.
--
-- Two sources of truth for one number is the trap here, so the rule is:
--
--   before an invoice exists   orders.total_amount / orders.deposit ARE the
--                              commercial terms
--   when one is created        the invoice seeds from them (see
--                              InvoicesService.createForOrder) and from then on
--                              the invoice is the document of record
--
-- orders.total_amount already existed and was simply never surfaced in the app;
-- this adds the other half so the pair is usable together.
-- ============================================================================

alter table public.orders
  add column if not exists deposit numeric(12, 2) not null default 0;

comment on column public.orders.deposit is
  'Amount already paid up front. Seeds invoices.deposit when an invoice is created.';
