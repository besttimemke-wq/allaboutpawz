-- ============================================================================
-- rpc_get_general_ledger(p_tenant_id uuid, p_start_date date, p_end_date date)
--
-- Returns the General Ledger detail for the given tenant over the date
-- range: one row per journal line, with the entry header (entry_no, entry_date,
-- memo, source) and the account (code, name, type) and the debit/credit.
-- Ordered by entry_date, entry_no, line_no so the caller can compute a
-- running balance per account if desired.
--
-- Tables: acct_journal_lines jl
--         JOIN acct_journal_entries je ON je.id = jl.journal_entry_id
--         JOIN acct_chart_of_accounts coa ON coa.id = jl.account_id
--         (filter: je.status='posted', je.entry_date BETWEEN)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_general_ledger(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  entry_no bigint,
  entry_date date,
  posting_date date,
  source text,
  memo text,
  reference text,
  line_no integer,
  account_code text,
  account_name text,
  account_type text,
  line_description text,
  debit numeric,
  credit numeric,
  running_balance numeric
)
LANGUAGE plpgsql
STABLE
AS $func$
BEGIN
  RETURN QUERY
  WITH ordered_lines AS (
    SELECT
      je.entry_no,
      je.entry_date,
      je.posting_date,
      je.source::text AS source,
      je.memo,
      je.reference,
      jl.line_no,
      coa.code AS account_code,
      coa.name AS account_name,
      coa.account_type::text AS account_type,
      jl.description AS line_description,
      jl.debit,
      jl.credit,
      -- Per-account running balance: SUM(debit - credit) up to and including
      -- this line, ordered by entry_date then entry_no then line_no.
      SUM(CASE
             WHEN coa.account_type IN ('asset','expense') THEN jl.debit - jl.credit
             WHEN coa.account_type IN ('liability','equity','revenue') THEN jl.credit - jl.debit
             ELSE jl.debit - jl.credit
           END)
        OVER (PARTITION BY coa.id ORDER BY je.entry_date, je.entry_no, jl.line_no) AS running_balance
    FROM public.acct_journal_lines jl
    JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
    JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
    WHERE jl.tenant_id = p_tenant_id
      AND je.tenant_id = p_tenant_id
      AND je.status = 'posted'
      AND je.entry_date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    ol.entry_no,
    ol.entry_date,
    ol.posting_date,
    ol.source,
    ol.memo,
    ol.reference,
    ol.line_no,
    ol.account_code,
    ol.account_name,
    ol.account_type,
    ol.line_description,
    ol.debit,
    ol.credit,
    ol.running_balance
  FROM ordered_lines ol
  ORDER BY ol.account_code, ol.entry_date, ol.entry_no, ol.line_no;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_general_ledger(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_general_ledger(uuid, date, date) TO service_role;

COMMENT ON FUNCTION public.rpc_get_general_ledger(uuid, date, date) IS
  'General Ledger detail over a date range. Returns per-line rows with a per-account running balance.';
