// ============================================================================
// Finance/Accounting DB-exact Types — verified against public.acct_* schema
// ============================================================================

export interface AcctBook {
  id: string;
  tenant_id: string;
  entity_id: string;
  code: string;
  name: string;
  book_type: string;
  accounting_basis: string;
  currency: string;
  is_active: boolean;
}

export interface AcctChartOfAccounts {
  id: string;
  tenant_id: string;
  entity_id: string;
  parent_account_id: string | null;
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
  is_active: boolean;
}

export interface AcctJournalEntry {
  id: string;
  tenant_id: string;
  entity_id: string;
  book_id: string;
  batch_id: string;
  period_id: string;
  entry_no: string;
  entry_date: string;
  document_number: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export interface AcctJournalLine {
  id: string;
  tenant_id: string;
  entity_id: string;
  journal_entry_id: string;
  line_no: number;
  account_id: string;
  description: string | null;
  debit: number;
  credit: number;
}

export interface AcctEntity {
  id: string;
  tenant_id: string;
  parent_entity_id: string | null;
  code: string;
  legal_name: string;
  display_name: string;
  entity_type: string;
  country: string;
}

export interface AcctFiscalYear {
  id: string;
  tenant_id: string;
  entity_id: string;
  fiscal_year: string;
  start_date: string;
  end_date: string;
  is_adjustment_year: boolean;
}

export interface AcctPeriod {
  id: string;
  tenant_id: string;
  book_id: string;
  fiscal_year_id: string;
  period_no: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface AcctCurrency {
  code: string;
  name: string;
  symbol: string;
  minor_units: number;
  is_active: boolean;
}

export interface AcctArInvoice {
  id: string;
  tenant_id: string;
  entity_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  outstanding_amount: number;
  status: string;
}

export interface AcctArReceipt {
  id: string;
  tenant_id: string;
  entity_id: string;
  customer_id: string;
  receipt_number: string;
  receipt_date: string;
  currency: string;
  amount: number;
  payment_method: string;
  status: string;
}

export interface AcctArCreditMemo {
  id: string;
  tenant_id: string;
  customer_id: string;
  memo_number: string;
  memo_date: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  status: string;
}

export interface AcctBankAccount {
  id: string;
  tenant_id: string;
  entity_id: string;
  name: string;
  institution_name: string;
  account_type: string;
  masked_account_number: string;
  currency: string;
  is_active: boolean;
}

export interface AcctBankTransaction {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  transaction_date: string;
  posted_date: string;
  amount: number;
  description: string;
  status: string;
}

export interface AcctTaxCode {
  id: string;
  tenant_id: string;
  jurisdiction_id: string;
  code: string;
  name: string;
  tax_type: string;
  rate: number;
  recoverable_percent: number;
  is_active: boolean;
}

export interface AcctTaxJurisdiction {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  country_code: string;
  state_code: string | null;
  locality: string | null;
  registration_number: string | null;
}

export interface AcctPayrollRun {
  id: string;
  tenant_id: string;
  pay_period_id: string;
  run_number: string;
  run_type: string;
  status: string;
  gross_total: number;
  net_total: number;
  tax_total: number;
}

export interface AcctEmployee {
  id: string;
  tenant_id: string;
  staff_id: string | null;
  user_id: string | null;
  employee_number: string;
  first_name: string;
  last_name: string;
  legal_name: string;
  hire_date: string | null;
  termination_date: string | null;
}

export interface CommerceGiftCard {
  id: string;
  tenant_id: string;
  card_number: string;
  balance: number;
  currency: string;
  status: string;
  initial_balance: number;
  issued_at: string;
  expires_at: string | null;
}
