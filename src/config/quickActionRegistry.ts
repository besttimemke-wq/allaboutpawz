export type QuickActionDomain =
  | 'crm' | 'customer' | 'appointment' | 'orders' | 'fulfillment'
  | 'purchasing' | 'accounting' | 'settings' | 'cms' | 'staff'
  | 'employee_portal' | 'customer_portal' | 'analytics' | 'system';

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
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  // 1. CRM
  { id: 'crm-new-appointment', domain: 'crm', label: 'New Appointment', icon: 'Calendar', actionType: 'route', targetPath: '/admin/appointments' },
  { id: 'crm-add-customer', domain: 'crm', label: 'Add Customer', icon: 'UserPlus', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'crm-add-pet', domain: 'crm', label: 'Add Pet', icon: 'PawPrint', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'crm-send-message', domain: 'crm', label: 'Send Message', icon: 'MessageSquare', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'crm-add-note', domain: 'crm', label: 'Add Note', icon: 'StickyNote', actionType: 'mutation', mutationKey: 'crm:actions' },
  // 2. Customer
  { id: 'cust-take-payment', domain: 'customer', label: 'Take Payment', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'cust-create-invoice', domain: 'customer', label: 'Create Invoice', icon: 'FileText', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'cust-checkout', domain: 'customer', label: 'Checkout', icon: 'ShoppingCart', actionType: 'route', targetPath: '/admin/pos' },
  { id: 'cust-book-next', domain: 'customer', label: 'Book Next Visit', icon: 'Calendar', actionType: 'route', targetPath: '/admin/appointments' },
  { id: 'cust-rebooking-link', domain: 'customer', label: 'Send Rebooking Link', icon: 'Link2', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'cust-magic-link', domain: 'customer', label: 'Send Magic Link', icon: 'Link', actionType: 'mutation', mutationKey: 'system:actions' },
  { id: 'cust-merge', domain: 'customer', label: 'Merge Customer', icon: 'GitMerge', actionType: 'mutation', mutationKey: 'crm:actions' },
  { id: 'cust-grooming-history', domain: 'customer', label: 'View Grooming History', icon: 'History', actionType: 'route', targetPath: '/admin/grooming-records' },
  { id: 'cust-payment-history', domain: 'customer', label: 'View Payment History', icon: 'Receipt', actionType: 'route', targetPath: '/admin/payments' },
  // 3. Appointment
  { id: 'apt-check-in', domain: 'appointment', label: 'Check In', icon: 'LogIn', actionType: 'mutation', mutationKey: 'appointment:actions' },
  { id: 'apt-in-service', domain: 'appointment', label: 'In Service', icon: 'Play', actionType: 'mutation', mutationKey: 'appointment:actions' },
  { id: 'apt-complete', domain: 'appointment', label: 'Complete', icon: 'Check', actionType: 'mutation', mutationKey: 'appointment:actions' },
  { id: 'apt-reschedule', domain: 'appointment', label: 'Reschedule', icon: 'CalendarClock', actionType: 'mutation', mutationKey: 'appointment:actions' },
  { id: 'apt-cancel', domain: 'appointment', label: 'Cancel', icon: 'X', actionType: 'mutation', mutationKey: 'appointment:actions' },
  { id: 'apt-no-show', domain: 'appointment', label: 'No Show', icon: 'UserX', actionType: 'mutation', mutationKey: 'appointment:actions' },
  { id: 'apt-send-reminder', domain: 'appointment', label: 'Send Reminder', icon: 'Bell', actionType: 'mutation', mutationKey: 'appointment:actions' },
  { id: 'apt-issue-refund', domain: 'appointment', label: 'Issue Refund', icon: 'RotateCcw', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'apt-add-to-waitlist', domain: 'appointment', label: 'Add to Waitlist', icon: 'List', actionType: 'mutation', mutationKey: 'appointment:actions' },
  // 4. Orders & Inventory
  { id: 'order-create', domain: 'orders', label: 'Create Order', icon: 'Plus', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-view', domain: 'orders', label: 'View Order Details', icon: 'Eye', actionType: 'route' },
  { id: 'order-create-po', domain: 'orders', label: 'Create PO', icon: 'Inbox', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-packing-slip', domain: 'orders', label: 'Packing Slip', icon: 'FileText', actionType: 'print', mutationKey: 'commerce:actions' },
  { id: 'order-shipping-label', domain: 'orders', label: 'Shipping Label', icon: 'Truck', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-resend-alert', domain: 'orders', label: 'Resend Alert', icon: 'Bell', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-restock', domain: 'orders', label: 'Restock / Add New Inventory', icon: 'Package', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'order-export-csv', domain: 'orders', label: 'Export CSV', icon: 'Download', actionType: 'export' },
  // 5. Fulfillment
  { id: 'fulfill-advance', domain: 'fulfillment', label: 'Advance Fulfillment Stage', icon: 'ArrowRight', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'fulfill-batch-slips', domain: 'fulfillment', label: 'Batch Slips', icon: 'Files', actionType: 'print' },
  { id: 'fulfill-postage', domain: 'fulfillment', label: 'Print Postage Labels', icon: 'Printer', actionType: 'print' },
  // 6. Purchasing
  { id: 'po-create', domain: 'purchasing', label: 'Create PO', icon: 'Inbox', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'po-receive', domain: 'purchasing', label: 'Receive Order', icon: 'PackageCheck', actionType: 'mutation', mutationKey: 'commerce:actions' },
  { id: 'po-view-vendor', domain: 'purchasing', label: 'View Vendor', icon: 'Building2', actionType: 'route', targetPath: '/admin/vendors' },
  // 7. Accounting
  { id: 'accts-mark-paid', domain: 'accounting', subCategory: 'Invoices', label: 'Mark as Paid', icon: 'Check', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-void-invoice', domain: 'accounting', subCategory: 'Invoices', label: 'Void Invoice', icon: 'X', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-send-reminder', domain: 'accounting', subCategory: 'Invoices', label: 'Send Reminder', icon: 'Bell', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-collect-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Collect Deposit', icon: 'DollarSign', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-release-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Release Deposit', icon: 'Unlock', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-forfeit-deposit', domain: 'accounting', subCategory: 'Deposits', label: 'Forfeit Deposit', icon: 'Ban', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-issue-refund', domain: 'accounting', subCategory: 'Refunds', label: 'Issue Refund', icon: 'RotateCcw', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-issue-gift-card', domain: 'accounting', subCategory: 'Gift Cards', label: 'Issue Gift Card', icon: 'Gift', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-redeem-gift-card', domain: 'accounting', subCategory: 'Gift Cards', label: 'Redeem Gift Card', icon: 'CreditCard', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-run-payroll', domain: 'accounting', subCategory: 'Payroll', label: 'Run Payroll', icon: 'Wallet', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-edit-timesheet', domain: 'accounting', subCategory: 'Payroll', label: 'Edit Timesheet', icon: 'Clock', actionType: 'mutation', mutationKey: 'finance:actions' },
  { id: 'accts-reconcile', domain: 'accounting', subCategory: 'Banking', label: 'Reconcile Bank Account', icon: 'Building', actionType: 'mutation', mutationKey: 'finance:actions' },
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
  { id: 'rpt-pnl', domain: 'analytics', subCategory: 'Financial', label: 'Run Profit & Loss', icon: 'BarChart3', actionType: 'route', targetPath: '/admin/analytics/revenue' },
  { id: 'rpt-balance-sheet', domain: 'analytics', subCategory: 'Financial', label: 'Run Balance Sheet', icon: 'Scale', actionType: 'route', targetPath: '/admin/analytics' },
  { id: 'rpt-commission', domain: 'analytics', subCategory: 'Financial', label: 'Run Groomer Commission Report', icon: 'Users', actionType: 'route', targetPath: '/admin/analytics/operations' },
  { id: 'rpt-revenue', domain: 'analytics', subCategory: 'Financial', label: 'Run Daily Revenue Summary', icon: 'DollarSign', actionType: 'route', targetPath: '/admin/analytics/revenue' },
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
