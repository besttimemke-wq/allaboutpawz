-- ============================================================================
-- rpc_get_balance_sheet(p_tenant_id uuid, p_as_of_date date)
--
-- Returns a Balance Sheet as of the given date for the given tenant.
-- Aggregates posted journal lines up to and including p_as_of_date.
-- Returns three top-level totals (assets, liabilities, equity) plus per-
-- account detail rows for each section.
--
-- Tables: acct_journal_entries (filter: status='posted', entry_date <=)
--         acct_journal_lines  (debit, credit)
--         acct_chart_of_accounts (account_type, normal_balance)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_balance_sheet(
  p_tenant_id uuid,
  p_as_of_date date
)
RETURNS TABLE(
  section text,
  account_code text,
  account_name text,
  account_type text,
  debit numeric,
  credit numeric,
  balance numeric
)
LANGUAGE plpgsql
STABLE
AS $func$
BEGIN
  -- Per-account detail rows for asset / liability / equity accounts
  RETURN QUERY
  SELECT
    CASE coa.account_type
      WHEN 'asset' THEN 'Assets'
      WHEN 'liability' THEN 'Liabilities'
      WHEN 'equity' THEN 'Equity'
      WHEN 'contra_asset' THEN 'Assets'
      WHEN 'contra_liability' THEN 'Liabilities'
      WHEN 'contra_equity' THEN 'Equity'
      ELSE 'Other'
    END AS section,
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_type::text AS account_type,
    COALESCE(SUM(jl.debit), 0)::numeric AS debit,
    COALESCE(SUM(jl.credit), 0)::numeric AS credit,
    CASE
      WHEN coa.account_type IN ('asset','contra_liability','contra_equity') THEN
        COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)::numeric
      WHEN coa.account_type IN ('liability','equity','contra_asset') THEN
        COALESCE(SUM(jl.credit) - SUM(jl.debit), 0)::numeric
      ELSE
        COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)::numeric
    END AS balance
  FROM public.acct_journal_lines jl
  JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
  JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
  WHERE jl.tenant_id = p_tenant_id
    AND je.tenant_id = p_tenant_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
    AND coa.account_type IN ('asset','liability','equity','contra_asset','contra_liability','contra_equity')
  GROUP BY coa.code, coa.name, coa.account_type
  ORDER BY
    CASE coa.account_type WHEN 'asset' THEN 1 WHEN 'liability' THEN 2 WHEN 'equity' THEN 3 ELSE 9 END,
    coa.code;

  -- Section totals
  RETURN QUERY
  SELECT
    'TOTAL'::text AS section,
    ''::text AS account_code,
    CASE
      WHEN coa.account_type = 'asset' THEN 'Total Assets'
      WHEN coa.account_type = 'liability' THEN 'Total Liabilities'
      WHEN coa.account_type = 'equity' THEN 'Total Equity'
      ELSE 'Other'
    END AS account_name,
    coa.account_type::text AS account_type,
    0::numeric AS debit,
    0::numeric AS credit,
    CASE
      WHEN coa.account_type IN ('asset','contra_liability','contra_equity') THEN
        COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)::numeric
      WHEN coa.account_type IN ('liability','equity','contra_asset') THEN
        COALESCE(SUM(jl.credit) - SUM(jl.debit), 0)::numeric
      ELSE 0::numeric
    END AS balance
  FROM public.acct_journal_lines jl
  JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
  JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
  WHERE jl.tenant_id = p_tenant_id
    AND je.tenant_id = p_tenant_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
    AND coa.account_type IN ('asset','liability','equity','contra_asset','contra_liability','contra_equity')
  GROUP BY coa.account_type
  ORDER BY
    CASE coa.account_type WHEN 'asset' THEN 1 WHEN 'liability' THEN 2 WHEN 'equity' THEN 3 ELSE 9 END;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_balance_sheet(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_balance_sheet(uuid, date) TO service_role;

COMMENT ON FUNCTION public.rpc_get_balance_sheet(uuid, date) IS
  'Balance Sheet (Assets, Liabilities, Equity) as of a date. Returns per-account rows + section totals.';
