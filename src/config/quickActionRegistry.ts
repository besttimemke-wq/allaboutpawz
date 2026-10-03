export type QuickActionDomain =
  | 'crm' | 'customer' | 'appointment' | 'orders' | 'fulfillment'
  | 'purchasing' | 'accounting' | 'settings' | 'cms' | 'staff'
  | 'employee_portal' | 'customer_portal' | 'analytics' | 'system';

export interface PayloadField {
  name: string;           // JSON key in the payload, e.g. "customer_id"
  label: string;          // UI label, e.g. "Customer ID"
  type?: 'text' | 'number' | 'date' | 'email' | 'textarea' | 'select' | 'uuid';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: string[];     // for 'select' type
  helpText?: string;
}

export interface QuickActionItem {
  id: string;
  domain: QuickActionDomain;
  subCategory?: string;
  label: string;
  shortcut?: string[];
  icon: string;
  actionType: 'modal' | 'route' | 'mutation' | 'export' | 'print';
  targetPath?: string;
  mutationKey?: string;
  /** When true (or when payloadFields is non-empty), the palette shows a
   * payload form modal before dispatching. When false and no payloadFields,
   * the action executes immediately with an empty payload (good for the
   * run_* automations like sys-run-rebooking). */
  requiresPayload?: boolean;
  payloadFields?: PayloadField[];
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  // 1. CRM
  { id: 'crm-new-appointment', domain: 'crm', label: 'New Appointment', icon: 'Calendar', actionType: 'route', targetPath: '/admin/appointments' },
  { id: 'crm-add-customer', domain: 'crm', label: 'Add Customer', icon: 'UserPlus', actionType: 'mutation', mutationKey: 'crm:actions', requiresPayload: true, payloadFields: [
    { name: 'first_name', label: 'First Name', type: 'text', required: true, placeholder: 'Jane' },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com' },
    { name: 'phone', label: 'Phone', type: 'text', placeholder: '555-123-4567' },
  ] },
  { id: 'crm-add-pet', domain: 'crm', label: 'Add Pet', icon: 'PawPrint', actionType: 'mutation', mutationKey: 'crm:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'name', label: 'Pet Name', type: 'text', required: true, placeholder: 'Buddy' },
    { name: 'species', label: 'Species', type: 'text', defaultValue: 'Dog' },
    { name: 'breed', label: 'Breed', type: 'text', placeholder: 'Labrador' },
    { name: 'sex', label: 'Sex', type: 'select', options: ['male', 'female', 'unknown'], defaultValue: 'unknown' },
    { name: 'weight', label: 'Weight (lbs)', type: 'number', placeholder: '25.5' },
  ] },
  { id: 'crm-send-message', domain: 'crm', label: 'Send Message', icon: 'MessageSquare', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'crm-add-note', domain: 'crm', label: 'Add Note', icon: 'StickyNote', actionType: 'mutation', mutationKey: 'crm:actions' },
  // 2. Customer
  { id: 'cust-take-payment', domain: 'customer', label: 'Take Payment', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '50.00' },
    { name: 'reference', label: 'Reference (optional)', type: 'text', placeholder: 'Stripe PI ID' },
  ] },
  { id: 'cust-create-invoice', domain: 'customer', label: 'Create Invoice', icon: 'FileText', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Invoice notes' },
  ] },
  { id: 'cust-checkout', domain: 'customer', label: 'Checkout', icon: 'ShoppingCart', actionType: 'route', targetPath: '/admin/pos' },
  { id: 'cust-book-next', domain: 'customer', label: 'Book Next Visit', icon: 'Calendar', actionType: 'route', targetPath: '/admin/appointments' },
  { id: 'cust-rebooking-link', domain: 'customer', label: 'Send Rebooking Link', icon: 'Link2', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'cust-magic-link', domain: 'customer', label: 'Send Magic Link', icon: 'Link', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'cust-merge', domain: 'customer', label: 'Merge Customer', icon: 'GitMerge', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'cust-merge-household', domain: 'customer', label: 'Merge Household', icon: 'Users', actionType: 'mutation', mutationKey: 'crm:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_ids', label: 'Customer IDs (comma-separated)', type: 'textarea', required: true, placeholder: 'uuid1, uuid2' },
    { name: 'name', label: 'Household Name', type: 'text', placeholder: 'Smith Household' },
  ] },
  { id: 'cust-update-documents', domain: 'customer', label: 'Update Documents', icon: 'FileEdit', actionType: 'mutation', mutationKey: 'crm:actions', requiresPayload: true, payloadFields: [
    { name: 'document_id', label: 'Document ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'name', label: 'Document Name', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: ['pending', 'submitted', 'signed', 'approved', 'expired', 'rejected', 'archived'] },
    { name: 'notes', label: 'Notes', type: 'text' },
  ] },
  { id: 'cust-view-documents', domain: 'customer', label: 'View Documents', icon: 'FolderOpen', actionType: 'mutation', mutationKey: 'crm:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', placeholder: '00000000-0000-...' },
  ] },
  { id: 'cust-add-to-campaign', domain: 'customer', label: 'Add to Campaign', icon: 'Megaphone', actionType: 'mutation', mutationKey: 'crm:actions', requiresPayload: true, payloadFields: [
    { name: 'campaign_id', label: 'Campaign ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'cust-print-history', domain: 'customer', label: 'Print History', icon: 'Printer', actionType: 'mutation', mutationKey: 'crm:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'cust-grooming-history', domain: 'customer', label: 'View Grooming History', icon: 'History', actionType: 'route', targetPath: '/admin/grooming-records' },
  { id: 'cust-payment-history', domain: 'customer', label: 'View Payment History', icon: 'Receipt', actionType: 'route', targetPath: '/admin/payments' },
  // 3. Appointment
  { id: 'apt-check-in', domain: 'appointment', label: 'Check In', icon: 'LogIn', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'apt-in-service', domain: 'appointment', label: 'In Service', icon: 'Play', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'apt-complete', domain: 'appointment', label: 'Complete', icon: 'Check', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'apt-reschedule', domain: 'appointment', label: 'Reschedule', icon: 'CalendarClock', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'new_starts_at', label: 'New Start Date/Time', type: 'date', required: true },
    { name: 'new_ends_at', label: 'New End Date/Time (optional)', type: 'date' },
  ] },
  { id: 'apt-cancel', domain: 'appointment', label: 'Cancel', icon: 'X', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'reason', label: 'Cancellation Reason', type: 'text', placeholder: 'customer_request' },
  ] },
  { id: 'apt-no-show', domain: 'appointment', label: 'No Show', icon: 'UserX', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'reason', label: 'No-Show Reason', type: 'text', placeholder: 'did not arrive' },
  ] },
  { id: 'apt-hold', domain: 'appointment', label: 'Hold', icon: 'Pause', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'apt-confirm', domain: 'appointment', label: 'Confirm Appointment', icon: 'CheckCircle', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'apt-send-reminder', domain: 'appointment', label: 'Send Reminder', icon: 'Bell', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'apt-duplicate', domain: 'appointment', label: 'Duplicate', icon: 'Copy', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'apt-follow-up', domain: 'appointment', label: 'Follow Up', icon: 'Phone', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'note', label: 'Follow-Up Note', type: 'text', placeholder: 'Call customer to rebook' },
  ] },
  { id: 'apt-add-to-waitlist', domain: 'appointment', label: 'Add to Waitlist', icon: 'List', actionType: 'mutation', mutationKey: 'appointment:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'pet_id', label: 'Pet ID (optional)', type: 'uuid' },
    { name: 'service_id', label: 'Service ID (optional)', type: 'uuid' },
    { name: 'preferred_date', label: 'Preferred Date/Time', type: 'date' },
  ] },
  { id: 'apt-issue-refund', domain: 'appointment', label: 'Issue Refund', icon: 'RotateCcw', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'apt-view-customer', domain: 'appointment', label: 'View Customer', icon: 'Eye', actionType: 'route', targetPath: '/admin/customers' },
  { id: 'apt-send-magic-link', domain: 'appointment', label: 'Send Magic Link', icon: 'Link', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'apt-take-payment', domain: 'appointment', label: 'Take Payment', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'apt-create-invoice', domain: 'appointment', label: 'Create Invoice', icon: 'FileText', actionType: 'mutation', mutationKey: 'finance:actions' },
  // 4. Orders & Inventory
  { id: 'order-create', domain: 'orders', label: 'Create Order', icon: 'Plus', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-view', domain: 'orders', label: 'View Order Details', icon: 'Eye', actionType: 'route', targetPath: '/admin/orders' },
  { id: 'order-create-po', domain: 'orders', label: 'Create PO', icon: 'Inbox', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-packing-slip', domain: 'orders', label: 'Packing Slip', icon: 'FileText', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'order_id', label: 'Order ID', type: 'text', required: true, placeholder: 'order-id' },
  ] },
  { id: 'order-shipping-label', domain: 'orders', label: 'Shipping Label', icon: 'Truck', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'order_id', label: 'Order ID', type: 'text', required: true, placeholder: 'order-id' },
    { name: 'sku_id', label: 'SKU ID (optional)', type: 'uuid' },
  ] },
  { id: 'order-resend-alert', domain: 'orders', label: 'Resend Alert', icon: 'Bell', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'order_id', label: 'Order ID', type: 'text', required: true, placeholder: 'order-id' },
    { name: 'customer_id', label: 'Customer ID (optional)', type: 'uuid' },
  ] },
  { id: 'order-restock', domain: 'orders', label: 'Restock / Add New Inventory', icon: 'Package', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'sku_id', label: 'SKU ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '10' },
    { name: 'unit_cost', label: 'Unit Cost', type: 'number', placeholder: '15.50' },
  ] },
  { id: 'order-export-csv', domain: 'orders', label: 'Export CSV (Inventory)', icon: 'Download', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-export-ledger', domain: 'orders', label: 'Export Inventory Ledger', icon: 'FileText', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-review-return', domain: 'orders', label: 'Review Return', icon: 'ClipboardCheck', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'rma_id', label: 'RMA / Return ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'decision', label: 'Decision', type: 'select', options: ['inspection', 'approved_for_refund', 'rejected', 'restocked', 'completed', 'cancelled'], defaultValue: 'inspection' },
    { name: 'notes', label: 'Review Notes', type: 'textarea' },
  ] },
  { id: 'order-track-return', domain: 'orders', label: 'Track Return', icon: 'Search', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'rma_id', label: 'RMA / Return ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'order-view-return', domain: 'orders', label: 'View Return', icon: 'Eye', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'rma_id', label: 'RMA / Return ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  // 5. Fulfillment
  { id: 'fulfill-advance', domain: 'fulfillment', label: 'Advance Fulfillment Stage', icon: 'ArrowRight', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'fulfill-batch-slips', domain: 'fulfillment', label: 'Batch Slips', icon: 'Files', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'order_ids', label: 'Order IDs (optional — leave empty for auto)', type: 'text', placeholder: 'uuid1,uuid2' },
  ] },
  { id: 'fulfill-postage', domain: 'fulfillment', label: 'Print Postage Labels', icon: 'Printer', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'order_id', label: 'Order ID', type: 'text', required: true, placeholder: 'order-id' },
  ] },
  // 6. Purchasing
  { id: 'po-create', domain: 'purchasing', label: 'Create PO', icon: 'Inbox', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'po-receive', domain: 'purchasing', label: 'Receive Order', icon: 'PackageCheck', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'po-view-vendor', domain: 'purchasing', label: 'View Vendor', icon: 'Building2', actionType: 'route', targetPath: '/admin/settings' },
  { id: 'po-edit-vendor', domain: 'purchasing', label: 'Edit Vendor', icon: 'Pencil', actionType: 'mutation', mutationKey: 'commerce:actions', requiresPayload: true, payloadFields: [
    { name: 'vendor_id', label: 'Vendor ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'name', label: 'Vendor Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'payment_terms', label: 'Payment Terms', type: 'text', placeholder: 'Net 30' },
    { name: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
    { name: 'is_active', label: 'Active', type: 'select', options: ['true', 'false'] },
  ] },
  // 7. Accounting
  { id: 'accts-mark-paid', domain: 'accounting', subCategory: 'Invoices', label: 'Mark as Paid', icon: 'Check', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-void-invoice', domain: 'accounting', subCategory: 'Invoices', label: 'Void Invoice', icon: 'X', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-void-cancel', domain: 'accounting', subCategory: 'Invoices', label: 'Void / Cancel Payment', icon: 'Ban', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'uuid', placeholder: 'For invoice void' },
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', placeholder: 'For payment cancel' },
    { name: 'reason', label: 'Reason', type: 'text', placeholder: 'customer_request' },
  ] },
  { id: 'accts-send-reminder', domain: 'accounting', subCategory: 'Invoices', label: 'Send Reminder', icon: 'Bell', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'invoice_id', label: 'Invoice ID (optional)', type: 'uuid' },
  ] },
  { id: 'accts-send-reminders', domain: 'accounting', subCategory: 'Invoices', label: 'Batch Send Payment Reminders', icon: 'BellRing', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-collect-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Collect Deposit', icon: 'DollarSign', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '50.00' },
    { name: 'appointment_id', label: 'Appointment ID', type: 'uuid' },
    { name: 'method', label: 'Method', type: 'select', options: ['card', 'cash', 'check', 'ach'], defaultValue: 'card' },
  ] },
  { id: 'accts-release-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Release Deposit', icon: 'Unlock', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'deposit_id', label: 'Deposit ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-forfeit-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Forfeit Deposit', icon: 'Ban', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'deposit_id', label: 'Deposit ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-apply-to-invoice', domain: 'accounting', subCategory: 'Deposits', label: 'Apply to Invoice', icon: 'FilePlus', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '25.00' },
    { name: 'deposit_id', label: 'Deposit ID (optional)', type: 'uuid' },
    { name: 'credit_id', label: 'Store Credit ID (optional)', type: 'uuid' },
  ] },
  { id: 'accts-issue-refund', domain: 'accounting', subCategory: 'Refunds', label: 'Issue Refund', icon: 'RotateCcw', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'order_id', label: 'Order ID', type: 'text', required: true, placeholder: 'order-abc123' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '25.00' },
    { name: 'reason', label: 'Reason', type: 'select', options: ['customer_request', 'service_issue', 'overcharge', 'other'], defaultValue: 'customer_request' },
  ] },
  { id: 'accts-register-refunds', domain: 'accounting', subCategory: 'Refunds', label: 'Register Refunds (Batch)', icon: 'ListPlus', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-issue-gift-card', domain: 'accounting', subCategory: 'Gift Cards', label: 'Issue Gift Card', icon: 'Gift', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'initial_balance', label: 'Initial Balance (USD)', type: 'number', required: true, placeholder: '100.00' },
    { name: 'recipient_email', label: 'Recipient Email', type: 'email', placeholder: 'recipient@example.com' },
  ] },
  { id: 'accts-redeem-gift-card', domain: 'accounting', subCategory: 'Gift Cards', label: 'Redeem Gift Card', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'card_number', label: 'Card Number', type: 'text', required: true, placeholder: 'GC-XXXX' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '25.00' },
  ] },
  { id: 'accts-redeem', domain: 'accounting', subCategory: 'Gift Cards', label: 'Redeem (Any Type)', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'card_number', label: 'Gift Card Number', type: 'text', placeholder: 'GC-XXXX' },
    { name: 'credit_number', label: 'Store Credit Number', type: 'text', placeholder: 'SC-XXXX' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '25.00' },
  ] },
  { id: 'accts-convert-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Convert Gift Card → Store Credit', icon: 'RefreshCw', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-reactivate-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Reactivate Gift Card', icon: 'Power', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-expire-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Expire Gift Card', icon: 'CalendarX', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-transfer-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Transfer Gift Card', icon: 'ArrowRightLeft', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'new_customer_id', label: 'New Holder Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-edit-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Edit Gift Card', icon: 'Pencil', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'recipient_name', label: 'Recipient Name', type: 'text' },
    { name: 'recipient_email', label: 'Recipient Email', type: 'email' },
    { name: 'recipient_phone', label: 'Recipient Phone', type: 'text' },
    { name: 'sender_name', label: 'Sender Name', type: 'text' },
    { name: 'gift_message', label: 'Gift Message', type: 'textarea' },
    { name: 'expires_at', label: 'Expires At', type: 'date' },
  ] },
  { id: 'accts-replace-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Replace Lost/Stolen Card', icon: 'RefreshCw', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Old Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'reason', label: 'Reason', type: 'select', options: ['lost', 'stolen', 'damaged', 'defective', 'other'], defaultValue: 'lost' },
  ] },
  { id: 'accts-void-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Void Gift Card', icon: 'Ban', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'reason', label: 'Reason', type: 'text', placeholder: 'fraud / refund / admin error' },
  ] },
  { id: 'accts-send-gc-receipt', domain: 'accounting', subCategory: 'Gift Cards', label: 'Send Gift Card Receipt', icon: 'Mail', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'to_email', label: 'Override Email (optional)', type: 'email' },
  ] },
  { id: 'accts-reissue-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Reissue Gift Card Receipt', icon: 'Send', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'gift_card_id', label: 'Gift Card ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'to_email', label: 'Override Email (optional)', type: 'email' },
  ] },
  { id: 'accts-send-reminder-gc', domain: 'accounting', subCategory: 'Gift Cards', label: 'Send Gift Card Reminders', icon: 'BellRing', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-issue-store-credit', domain: 'accounting', subCategory: 'Store Credit', label: 'Issue Store Credit', icon: 'Ticket', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '75.00' },
    { name: 'expires_at', label: 'Expires At', type: 'date' },
  ] },
  { id: 'accts-add-value', domain: 'accounting', subCategory: 'Store Credit', label: 'Add Value to Account', icon: 'PlusCircle', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'amount', label: 'Amount (USD)', type: 'number', required: true, placeholder: '25.00' },
    { name: 'reason', label: 'Reason', type: 'text', placeholder: 'manual_adjustment' },
  ] },
  { id: 'accts-register-credits', domain: 'accounting', subCategory: 'Store Credit', label: 'Register Credits (Batch)', icon: 'ListPlus', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-run-payroll', domain: 'accounting', subCategory: 'Payroll', label: 'Run Payroll', icon: 'Wallet', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'period_start', label: 'Period Start', type: 'date', required: true },
    { name: 'period_end', label: 'Period End', type: 'date', required: true },
    { name: 'pay_date', label: 'Pay Date', type: 'date' },
  ] },
  { id: 'accts-edit-timesheet', domain: 'accounting', subCategory: 'Payroll', label: 'Edit Timesheet', icon: 'Clock', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'timesheet_id', label: 'Timesheet ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'hours_regular', label: 'Regular Hours', type: 'number', placeholder: '8.0' },
    { name: 'hours_overtime', label: 'Overtime Hours', type: 'number', placeholder: '2.0' },
    { name: 'hours_pto', label: 'PTO Hours', type: 'number', placeholder: '0' },
    { name: 'hours_sick', label: 'Sick Hours', type: 'number', placeholder: '0' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', options: ['draft', 'approved', 'submitted'], defaultValue: 'draft' },
  ] },
  { id: 'accts-reconcile', domain: 'accounting', subCategory: 'Banking', label: 'Reconcile Bank Account', icon: 'Building', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'bank_account_id', label: 'Bank Account ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'as_of_date', label: 'As Of Date', type: 'date', required: true },
    { name: 'statement_balance', label: 'Statement Balance (USD)', type: 'number', required: true, placeholder: '5000.00' },
  ] },
  { id: 'order-export-ledger', domain: 'accounting', subCategory: 'Banking', label: 'Export Ledger', icon: 'Download', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-bank-connect', domain: 'accounting', subCategory: 'Banking', label: 'Connect Bank Account', icon: 'Building', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'name', label: 'Account Name', type: 'text', required: true, placeholder: 'Main Checking' },
    { name: 'institution_name', label: 'Institution', type: 'text', placeholder: 'Chase' },
    { name: 'account_type', label: 'Account Type', type: 'select', options: ['checking', 'savings', 'credit'], defaultValue: 'checking' },
    { name: 'masked_account_number', label: 'Masked Account #', type: 'text', placeholder: '****1234' },
    { name: 'provider', label: 'Provider', type: 'select', options: ['plaid', 'stripe', 'manually'], defaultValue: 'manually' },
  ] },
  { id: 'accts-bank-payouts', domain: 'accounting', subCategory: 'Banking', label: 'View Bank Payouts', icon: 'ArrowDownToLine', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'accts-register-open', domain: 'accounting', subCategory: 'Register', label: 'Open Cash Register', icon: 'LockOpen', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'register_number', label: 'Register Number', type: 'text', required: true, defaultValue: 'REG-01' },
    { name: 'opening_cash', label: 'Opening Cash Float', type: 'number', required: true, placeholder: '200.00' },
    { name: 'staff_id', label: 'Staff ID (optional)', type: 'uuid' },
  ] },
  { id: 'accts-register-close', domain: 'accounting', subCategory: 'Register', label: 'Close Cash Register', icon: 'Lock', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'session_id', label: 'Session ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'counted_cash', label: 'Counted Cash', type: 'number', required: true, placeholder: '350.00' },
    { name: 'gross_sales', label: 'Gross Sales', type: 'number', placeholder: '500.00' },
    { name: 'cash_sales', label: 'Cash Sales', type: 'number', placeholder: '150.00' },
    { name: 'card_sales', label: 'Card Sales', type: 'number', placeholder: '350.00' },
    { name: 'transaction_count', label: 'Transaction Count', type: 'number', placeholder: '12' },
  ] },
  { id: 'accts-register-x-report', domain: 'accounting', subCategory: 'Register', label: 'X Report (Mid-Day)', icon: 'FileBarChart', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'session_id', label: 'Session ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-register-z-report', domain: 'accounting', subCategory: 'Register', label: 'Z Report (End-of-Day)', icon: 'FileCheck', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'session_id', label: 'Session ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  // Module 7 remaining nodes
  { id: 'accts-print-receipt', domain: 'accounting', subCategory: 'Payments', label: 'Print Receipt', icon: 'Printer', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-edit-invoice', domain: 'accounting', subCategory: 'Invoices', label: 'Edit Invoice', icon: 'Pencil', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'text' },
    { name: 'terms', label: 'Terms', type: 'text', placeholder: 'Net 30' },
  ] },
  { id: 'accts-duplicate-invoice', domain: 'accounting', subCategory: 'Invoices', label: 'Duplicate Invoice', icon: 'Copy', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-delete-invoice', domain: 'accounting', subCategory: 'Invoices', label: 'Delete Invoice (Void)', icon: 'Trash2', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-transfer-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Transfer Deposit', icon: 'ArrowRightLeft', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'deposit_id', label: 'Deposit ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'new_customer_id', label: 'New Customer ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'reason', label: 'Transfer Reason', type: 'text' },
  ] },
  { id: 'accts-edit-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Edit Deposit', icon: 'Pencil', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'deposit_id', label: 'Deposit ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'method', label: 'Method', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'text' },
  ] },
  { id: 'accts-receipt-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Deposit Receipt', icon: 'Receipt', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'deposit_id', label: 'Deposit ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-approve-refund', domain: 'accounting', subCategory: 'Refunds', label: 'Approve Refund', icon: 'Check', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-reject-refund', domain: 'accounting', subCategory: 'Refunds', label: 'Reject Refund', icon: 'X', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'reason', label: 'Rejection Reason', type: 'text' },
  ] },
  { id: 'accts-edit-refund', domain: 'accounting', subCategory: 'Refunds', label: 'Edit Refund', icon: 'Pencil', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'order_id', label: 'Order ID', type: 'text', required: true, placeholder: 'order-id' },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'reason', label: 'Reason', type: 'text' },
  ] },
  { id: 'accts-dispute-refund', domain: 'accounting', subCategory: 'Refunds', label: 'Dispute Refund', icon: 'AlertTriangle', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'reason', label: 'Dispute Reason', type: 'text', required: true },
    { name: 'amount', label: 'Dispute Amount', type: 'number' },
  ] },
  { id: 'accts-receipt-refund', domain: 'accounting', subCategory: 'Refunds', label: 'Refund Receipt', icon: 'Receipt', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-refund-notes', domain: 'accounting', subCategory: 'Refunds', label: 'Add Refund Notes', icon: 'StickyNote', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'note', label: 'Note', type: 'textarea', required: true },
  ] },
  { id: 'accts-view-original-refund', domain: 'accounting', subCategory: 'Refunds', label: 'View Original Transaction', icon: 'Eye', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'accts-check-card-balance', domain: 'accounting', subCategory: 'Gift Cards', label: 'Check Card Balance', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'card_number', label: 'Card Number', type: 'text', required: true, placeholder: 'GC-XXXX' },
  ] },
  { id: 'accts-view-tax-forms', domain: 'accounting', subCategory: 'Payroll', label: 'View Tax Forms', icon: 'FileText', actionType: 'mutation', mutationKey: 'finance:actions' },
  // Register POS shortcuts (delegation to existing handlers)
  { id: 'reg-print-receipts', domain: 'accounting', subCategory: 'Register', label: 'Register: Print Receipt', icon: 'Printer', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'payment_id', label: 'Payment ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
  ] },
  { id: 'reg-refunds', domain: 'accounting', subCategory: 'Register', label: 'Register: Process Refund', icon: 'RotateCcw', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'reg-credits', domain: 'accounting', subCategory: 'Register', label: 'Register: Issue Credit', icon: 'Ticket', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'reg-discounts', domain: 'accounting', subCategory: 'Register', label: 'Register: Apply Discount', icon: 'Percent', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'reg-gift-card', domain: 'accounting', subCategory: 'Register', label: 'Register: Sell Gift Card', icon: 'Gift', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'reg-coupons', domain: 'accounting', subCategory: 'Register', label: 'Register: Accept Coupon', icon: 'Ticket', actionType: 'mutation', mutationKey: 'commerce:actions' },
  // 8. Settings
  { id: 'set-add-location', domain: 'settings', subCategory: 'Organization', label: 'Add Location', icon: 'MapPin', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'set-switch-location', domain: 'settings', subCategory: 'Organization', label: 'Switch Location', icon: 'ArrowLeftRight', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'set-add-user', domain: 'settings', subCategory: 'Admin Users', label: 'Add User', icon: 'UserPlus', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'set-toggle-booking', domain: 'settings', subCategory: 'Booking', label: 'Toggle Online Self-Booking', icon: 'ToggleLeft', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'set-edit-hours', domain: 'settings', subCategory: 'Booking', label: 'Edit Operating Hours', icon: 'Clock', actionType: 'route', targetPath: '/admin/settings' },
  { id: 'set-add-blackout', domain: 'settings', subCategory: 'Booking', label: 'Add Holiday Blackout', icon: 'CalendarX', actionType: 'mutation', mutationKey: 'system:actions' },
  // 9. CMS
  { id: 'cms-add-service', domain: 'cms', subCategory: 'Services', label: 'Add New Service', icon: 'Plus', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'cms-edit-pricing', domain: 'cms', subCategory: 'Services', label: 'Edit Pricing Rules', icon: 'DollarSign', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'cms-add-surcharge', domain: 'cms', subCategory: 'Services', label: 'Add Surcharge', icon: 'Percent', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'cms-edit-page', domain: 'cms', subCategory: 'Website', label: 'Edit Page', icon: 'FileEdit', actionType: 'route', targetPath: '/admin/settings' },
  { id: 'cms-edit-nav', domain: 'cms', subCategory: 'Website', label: 'Edit Navigation', icon: 'Menu', actionType: 'route', targetPath: '/admin/settings' },
  // 10 new CMS sub-actions
  { id: 'cms-edit-pricing-rules', domain: 'cms', subCategory: 'Services', label: 'Batch Edit Pricing Rules', icon: 'ListChecks', actionType: 'mutation', mutationKey: 'cms:actions' },
  { id: 'cms-update-page', domain: 'cms', subCategory: 'Website', label: 'Update Page Content', icon: 'FileEdit', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'page_id', label: 'Page ID', type: 'uuid', required: true, placeholder: '00000000-0000-...' },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'body', label: 'Body (Markdown)', type: 'textarea' },
    { name: 'excerpt', label: 'Excerpt', type: 'text' },
    { name: 'featured_image_url', label: 'Featured Image URL', type: 'text' },
    { name: 'change_note', label: 'Change Note', type: 'text', placeholder: 'Updated pricing section' },
  ] },
  { id: 'cms-add-banner', domain: 'cms', subCategory: 'Website', label: 'Add Promotional Banner', icon: 'Image', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'name', label: 'Banner Name', type: 'text', required: true, placeholder: 'Summer Sale' },
    { name: 'banner_type', label: 'Type', type: 'select', options: ['hero', 'promo_bar', 'popup', 'inline', 'footer', 'alert'], defaultValue: 'promo_bar' },
    { name: 'headline', label: 'Headline', type: 'text', required: true, placeholder: '20% Off All Grooming!' },
    { name: 'subheadline', label: 'Subheadline', type: 'text' },
    { name: 'cta_label', label: 'CTA Label', type: 'text', placeholder: 'Book Now' },
    { name: 'cta_url', label: 'CTA URL', type: 'text', placeholder: '/book' },
    { name: 'image_url', label: 'Image URL', type: 'text' },
    { name: 'placement', label: 'Placement', type: 'select', options: ['home', 'all_pages', 'services', 'booking', 'portal', 'custom'], defaultValue: 'home' },
    { name: 'starts_at', label: 'Starts At', type: 'date' },
    { name: 'ends_at', label: 'Ends At', type: 'date' },
  ] },
  { id: 'cms-update-gallery', domain: 'cms', subCategory: 'Website', label: 'Add Gallery Image', icon: 'Images', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'gallery_slug', label: 'Gallery Slug', type: 'text', placeholder: 'before-after' },
    { name: 'image_url', label: 'Image URL', type: 'text', required: true, placeholder: 'https://...' },
    { name: 'before_image_url', label: 'Before Image URL (optional)', type: 'text' },
    { name: 'caption', label: 'Caption', type: 'text' },
    { name: 'alt_text', label: 'Alt Text', type: 'text' },
    { name: 'consent_on_file', label: 'Consent On File', type: 'select', options: ['true', 'false'], defaultValue: 'false' },
  ] },
  { id: 'cms-edit-navigation', domain: 'cms', subCategory: 'Website', label: 'Edit Navigation Link', icon: 'Menu', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'menu_key', label: 'Menu', type: 'select', options: ['primary', 'footer', 'mobile', 'utility', 'portal'], defaultValue: 'primary' },
    { name: 'nav_id', label: 'Nav Link ID (for update)', type: 'uuid' },
    { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'Services' },
    { name: 'url', label: 'URL', type: 'text', placeholder: '/services' },
    { name: 'sort_order', label: 'Sort Order', type: 'number', placeholder: '0' },
    { name: 'opens_new_tab', label: 'Opens New Tab', type: 'select', options: ['true', 'false'], defaultValue: 'false' },
    { name: 'is_active', label: 'Active', type: 'select', options: ['true', 'false'], defaultValue: 'true' },
  ] },
  { id: 'cms-edit-global-content', domain: 'cms', subCategory: 'Website', label: 'Edit Global Content', icon: 'Globe', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'content_key', label: 'Content Key', type: 'text', required: true, placeholder: 'phone_number' },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Salon Phone Number' },
    { name: 'value_text', label: 'Value (Text)', type: 'text' },
    { name: 'content_group', label: 'Group', type: 'select', options: ['general', 'contact', 'social', 'branding', 'hours'], defaultValue: 'general' },
  ] },
  { id: 'cms-update-seo', domain: 'cms', subCategory: 'Website', label: 'Update SEO Metadata', icon: 'Search', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'page_id', label: 'Page ID (for page-level SEO)', type: 'uuid' },
    { name: 'meta_title', label: 'Meta Title', type: 'text' },
    { name: 'meta_description', label: 'Meta Description', type: 'textarea' },
    { name: 'canonical_url', label: 'Canonical URL', type: 'text' },
    { name: 'og_title', label: 'OG Title', type: 'text' },
    { name: 'og_description', label: 'OG Description', type: 'textarea' },
    { name: 'og_image_url', label: 'OG Image URL', type: 'text' },
  ] },
  { id: 'cms-edit-legal-waivers', domain: 'cms', subCategory: 'Website', label: 'Edit Legal Waivers', icon: 'Scale', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'slug', label: 'Slug', type: 'text', required: true, defaultValue: 'legal-waivers' },
    { name: 'title', label: 'Title', type: 'text', required: true, defaultValue: 'Legal Waivers & Liability Release' },
    { name: 'body', label: 'Body (Markdown)', type: 'textarea' },
  ] },
  { id: 'cms-edit-gateway-settings', domain: 'cms', subCategory: 'Website', label: 'Edit Gateway Settings', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'cms:actions', requiresPayload: true, payloadFields: [
    { name: 'method_code', label: 'Method Code', type: 'select', options: ['stripe_card', 'manual_cash', 'manual_card'], defaultValue: 'stripe_card' },
    { name: 'active', label: 'Active', type: 'select', options: ['true', 'false'] },
  ] },
  { id: 'cms-services-catalog-view', domain: 'cms', subCategory: 'Services', label: 'View Services Catalog', icon: 'BookOpen', actionType: 'mutation', mutationKey: 'cms:actions' },
  // 10. Staff
  { id: 'staff-add-member', domain: 'staff', label: 'Add Team Member', icon: 'UserPlus', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'staff-build-schedule', domain: 'staff', label: 'Build Schedule', icon: 'Calendar', actionType: 'route', targetPath: '/admin/schedule' },
  { id: 'staff-assign-shifts', domain: 'staff', label: 'Assign Shifts', icon: 'Clock', actionType: 'mutation', mutationKey: 'system:actions' },
  // 11. Employee Portal
  { id: 'emp-clock-in', domain: 'employee_portal', subCategory: 'HR', label: 'Clock In', icon: 'LogIn', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'emp-clock-out', domain: 'employee_portal', subCategory: 'HR', label: 'Clock Out', icon: 'LogOut', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'emp-add-incident', domain: 'employee_portal', subCategory: 'Notes', label: 'Add Incident Report', icon: 'AlertTriangle', actionType: 'mutation', mutationKey: 'system:actions' },
  // 12. Customer Portal
  { id: 'cp-schedule', domain: 'customer_portal', subCategory: 'Appointments', label: 'Schedule Appointment', icon: 'Calendar', actionType: 'route' },
  { id: 'cp-view-orders', domain: 'customer_portal', subCategory: 'Orders', label: 'View Orders', icon: 'ShoppingBag', actionType: 'route' },
  { id: 'cp-view-receipts', domain: 'customer_portal', subCategory: 'Receipts', label: 'View Receipts', icon: 'Receipt', actionType: 'route' },
  // 13. Analytics
  { id: 'rpt-pnl', domain: 'analytics', subCategory: 'Financial', label: 'Run Profit & Loss', icon: 'BarChart3', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true },
  ] },
  { id: 'rpt-balance-sheet', domain: 'analytics', subCategory: 'Financial', label: 'Run Balance Sheet', icon: 'Scale', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'as_of_date', label: 'As Of Date', type: 'date', required: true },
  ] },
  { id: 'rpt-trial-balance', domain: 'analytics', subCategory: 'Financial', label: 'Run Trial Balance', icon: 'BookOpen', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'end_date', label: 'As Of Date', type: 'date', required: true },
  ] },
  { id: 'rpt-general-ledger', domain: 'analytics', subCategory: 'Financial', label: 'Run General Ledger', icon: 'FileText', actionType: 'mutation', mutationKey: 'finance:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true },
  ] },
  { id: 'rpt-commission', domain: 'analytics', subCategory: 'Financial', label: 'Run Groomer Commission Report', icon: 'Users', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true },
  ] },
  { id: 'rpt-revenue', domain: 'analytics', subCategory: 'Financial', label: 'Run Daily Revenue Summary', icon: 'DollarSign', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'analytics-view-bookings-funnel', domain: 'analytics', subCategory: 'Operations', label: 'View Bookings Funnel', icon: 'Filter', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'analytics-view-no-show-rate', domain: 'analytics', subCategory: 'Operations', label: 'View No-Show Rate', icon: 'UserX', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'analytics-view-rebook-rate', domain: 'analytics', subCategory: 'Operations', label: 'View Rebook Rate', icon: 'RefreshCw', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  // Entity Reports — 10 SQL aggregation reports
  { id: 'analytics-view-service-revenue', domain: 'analytics', subCategory: 'Entity Reports', label: 'Service Revenue Report', icon: 'Scissors', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'analytics-view-product-sales', domain: 'analytics', subCategory: 'Entity Reports', label: 'Product Sales Report', icon: 'Package', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'analytics-view-multi-location-revenue', domain: 'analytics', subCategory: 'Entity Reports', label: 'Multi-Location Revenue Report', icon: 'MapPin', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'analytics-view-groomer-performance', domain: 'analytics', subCategory: 'Entity Reports', label: 'Groomer Performance Report', icon: 'Users', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
  ] },
  { id: 'analytics-view-customer-acquisition', domain: 'analytics', subCategory: 'Entity Reports', label: 'Customer Acquisition Report', icon: 'UserPlus', actionType: 'mutation', mutationKey: 'analytics:actions' },
  { id: 'analytics-view-ar-aging', domain: 'analytics', subCategory: 'Entity Reports', label: 'AR Aging Report', icon: 'Clock', actionType: 'mutation', mutationKey: 'analytics:actions', requiresPayload: true, payloadFields: [
    { name: 'as_of_date', label: 'As Of Date (optional)', type: 'date' },
  ] },
  { id: 'analytics-view-gift-card-liability', domain: 'analytics', subCategory: 'Entity Reports', label: 'Gift Card Liability Report', icon: 'Gift', actionType: 'mutation', mutationKey: 'analytics:actions' },
  { id: 'analytics-view-store-credit-liability', domain: 'analytics', subCategory: 'Entity Reports', label: 'Store Credit Liability Report', icon: 'Ticket', actionType: 'mutation', mutationKey: 'analytics:actions' },
  { id: 'analytics-view-deposit-liability', domain: 'analytics', subCategory: 'Entity Reports', label: 'Deposit Liability Report', icon: 'DollarSign', actionType: 'mutation', mutationKey: 'analytics:actions' },
  // 14. System
  { id: 'sys-global-search', domain: 'system', subCategory: 'Global Search', label: 'Search Customers', icon: 'Search', actionType: 'modal' },
  { id: 'sys-run-rebooking', domain: 'system', subCategory: 'Automation', label: 'Run Rebooking Automation', icon: 'RefreshCw', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'sys-run-vaccine', domain: 'system', subCategory: 'Automation', label: 'Run Vaccine Reminders', icon: 'Syringe', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'sys-run-birthday', domain: 'system', subCategory: 'Automation', label: 'Run Birthday Messages', icon: 'Cake', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'sys-run-duplicate', domain: 'system', subCategory: 'Automation', label: 'Run Duplicate Detection', icon: 'Copy', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'sys-export-ledger', domain: 'system', subCategory: 'Export', label: 'Export Ledger', icon: 'Download', actionType: 'export' },
];

export const DOMAIN_LABELS: Record<QuickActionDomain, string> = {
  crm: 'CRM', customer: 'Customer', appointment: 'Appointment', orders: 'Orders',
  fulfillment: 'Fulfillment', purchasing: 'Purchasing', accounting: 'Accounting',
  settings: 'Settings', cms: 'CMS', staff: 'Staff', employee_portal: 'Employee Portal',
  customer_portal: 'Customer Portal', analytics: 'Analytics', system: 'System',
};
