-- ============================================================================
-- rpc_get_profit_and_loss(p_tenant_id uuid, p_start_date date, p_end_date date)
--
-- Returns a Profit & Loss statement (Income Statement) for the given tenant
-- over the given date range. Aggregates posted journal lines by account,
-- grouped by account_type. Revenue accounts have normal_balance='credit'
-- (so revenue = SUM(credit) - SUM(debit)); expense/COGS accounts have
-- normal_balance='debit' (so expense = SUM(debit) - SUM(credit)).
--
-- Returns one row per account, plus a final row with account_code='TOTAL'
-- carrying the rolled-up revenue/expense/net_income totals.
--
-- Tables: acct_journal_entries (filter: status='posted', entry_date BETWEEN)
--         acct_journal_lines  (debit, credit, account_id)
--         acct_chart_of_accounts (code, name, account_type, normal_balance)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_profit_and_loss(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  account_code text,
  account_name text,
  account_type text,
  debit numeric,
  credit numeric,
  net_amount numeric
)
LANGUAGE plpgsql
STABLE
AS $func$
BEGIN
  RETURN QUERY
  SELECT
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_type::text AS account_type,
    COALESCE(SUM(jl.debit), 0)::numeric AS debit,
    COALESCE(SUM(jl.credit), 0)::numeric AS credit,
    CASE
      WHEN coa.account_type = 'revenue' THEN
        COALESCE(SUM(jl.credit) - SUM(jl.debit), 0)::numeric
      WHEN coa.account_type = 'expense' THEN
        COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)::numeric
      ELSE
        0::numeric
    END AS net_amount
  FROM public.acct_journal_lines jl
  JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
  JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
  WHERE jl.tenant_id = p_tenant_id
    AND je.tenant_id = p_tenant_id
    AND je.status = 'posted'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND coa.account_type IN ('revenue', 'expense')
  GROUP BY coa.code, coa.name, coa.account_type
  ORDER BY coa.account_type, coa.code;

  -- Totals row
  RETURN QUERY
  SELECT
    'TOTAL'::text AS account_code,
    'Net Income'::text AS account_name,
    'total'::text AS account_type,
    0::numeric AS debit,
    0::numeric AS credit,
    (
      COALESCE((SELECT SUM(jl.credit) - SUM(jl.debit) FROM public.acct_journal_lines jl
                 JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
                 JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
                 WHERE jl.tenant_id = p_tenant_id AND je.status = 'posted'
                   AND je.entry_date BETWEEN p_start_date AND p_end_date
                   AND coa.account_type = 'revenue'), 0)
      -
      COALESCE((SELECT SUM(jl.debit) - SUM(jl.credit) FROM public.acct_journal_lines jl
                 JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
                 JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
                 WHERE jl.tenant_id = p_tenant_id AND je.status = 'posted'
                   AND je.entry_date BETWEEN p_start_date AND p_end_date
                   AND coa.account_type = 'expense'), 0)
    )::numeric AS net_amount;
END;
$func$;

-- Revoke public access — only the service-role (server-side) should call this.
REVOKE EXECUTE ON FUNCTION public.rpc_get_profit_and_loss(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_profit_and_loss(uuid, date, date) TO service_role;

COMMENT ON FUNCTION public.rpc_get_profit_and_loss(uuid, date, date) IS
  'Profit & Loss statement for a tenant over a date range. Returns per-account rows + a totals row.';
