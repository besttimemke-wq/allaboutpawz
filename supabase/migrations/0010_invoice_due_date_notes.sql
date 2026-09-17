-- 0010: invoices.dueDate + invoices.notes
-- Additive, idempotent. Completes the order-to-cash write path:
-- the admin Invoices module needs a payment due date and free-text
-- notes alongside the existing number/status/total/balance columns.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "dueDate" date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.invoices."dueDate" IS 'Payment due date (admin-set at invoice creation); NULL = due on receipt.';
COMMENT ON COLUMN public.invoices.notes IS 'Free-text notes for the invoice (admin-visible, not customer-facing yet).';
