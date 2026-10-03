-- ============================================================================
-- rpc_get_trial_balance(p_tenant_id uuid, p_end_date date)
--
-- Returns a Trial Balance as of the given date: every account with its
-- total debit and credit activity through p_end_date. The debit and credit
-- totals at the bottom MUST be equal (in double-entry accounting).
--
-- Tables: acct_journal_lines JOIN acct_journal_entries JOIN acct_chart_of_accounts
--         (filter: je.status='posted', je.entry_date <= p_end_date)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_trial_balance(
  p_tenant_id uuid,
  p_end_date date
)
RETURNS TABLE(
  account_code text,
  account_name text,
  account_type text,
  total_debit numeric,
  total_credit numeric,
  balance numeric
)
LANGUAGE plpgsql
STABLE
AS $func$
BEGIN
  -- Per-account detail rows
  RETURN QUERY
  SELECT
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_type::text AS account_type,
    COALESCE(SUM(jl.debit), 0)::numeric AS total_debit,
    COALESCE(SUM(jl.credit), 0)::numeric AS total_credit,
    CASE
      WHEN coa.account_type IN ('asset','expense') THEN
        COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)::numeric
      WHEN coa.account_type IN ('liability','equity','revenue') THEN
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
    AND je.entry_date <= p_end_date
  GROUP BY coa.code, coa.name, coa.account_type
  ORDER BY coa.code;

  -- Final totals row (debits should equal credits in double-entry)
  RETURN QUERY
  SELECT
    'TOTAL'::text AS account_code,
    'Totals (debits must equal credits)'::text AS account_name,
    'total'::text AS account_type,
    COALESCE(SUM(jl.debit), 0)::numeric AS total_debit,
    COALESCE(SUM(jl.credit), 0)::numeric AS total_credit,
    0::numeric AS balance
  FROM public.acct_journal_lines jl
  JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
  WHERE jl.tenant_id = p_tenant_id
    AND je.tenant_id = p_tenant_id
    AND je.status = 'posted'
    AND je.entry_date <= p_end_date;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_trial_balance(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_trial_balance(uuid, date) TO service_role;

COMMENT ON FUNCTION public.rpc_get_trial_balance(uuid, date) IS
  'Trial Balance as of a date. Returns per-account debit/credit totals + a totals row.';
