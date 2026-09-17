export interface SystemSettings {
  // 1. Organization & Brand (OrgMultiLocationScreen, OrgBrandIdentityScreen)
  org_business_name: string;
  org_tagline: string;
  org_phone: string;
  org_email: string;
  org_website: string;
  org_address: string;
  org_tax_ein: string;
  org_timezone: string;
  org_logo_url: string;
  org_primary_color: string;
  org_secondary_color: string;
  org_corners: "SQUARE" | "ROUNDED" | "PILL";
  org_accent_dim: string;

  // 2. Booking Operations & Rules (BookingOperationsRulesScreen, BookingRulesPoliciesScreen)
  booking_allow_automatic_confirm: boolean;
  booking_max_horizon_days: number;
  booking_turnaround_buffer_minutes: number;
  booking_default_duration_minutes: number;
  booking_overbooking_threshold_percent: number;
  booking_cancellation_cutoff_hours: number;
  booking_no_show_fee: number;
  booking_required_vaccines: string; // comma-separated or json string
  booking_require_deposit: boolean;
  booking_deposit_percent: number;
  booking_deposit_flat_amount: number;

  // 3. Financial, Payments & Stripe (StripeIntegrationScreen, PaymentsTaxLegalScreen, EscrowDepositsForfeituresScreen)
  stripe_account_id: string;
  stripe_connection_status: "CONNECTED" | "NOT_CONNECTED" | "PENDING";
  stripe_mode: "LIVE" | "TEST";
  payment_tax_rate_percent: number;
  payment_enable_tips: boolean;
  payment_allow_split_payments: boolean;
  payment_escrow_hold_days: number;
  payment_commission_default_rate: number;

  // 4. Invoices & Aging Ledger (InvoicesAgingLedgerScreen)
  invoice_due_days: number;
  invoice_late_fee_percent: number;
  invoice_late_fee_days: number;
  invoice_auto_remind_days: string; // comma-separated e.g. "3,7,14"

  // 5. Portals & Website (CmsBookingWizardScreen, CustomerPortalScreen)
  portal_allow_self_cancel: boolean;
  portal_allow_self_reschedule: boolean;
  portal_show_pricing_upfront: boolean;
  portal_custom_domain: string;
  portal_enable_chat: boolean;
  portal_theme: "light" | "dark" | "system";

  // 6. Social Integrations & Directories (OrgSocialDirectoriesScreen)
  social_instagram_handle: string;
  social_facebook_page: string;
  social_yelp_url: string;
  social_google_business_id: string;

  // 7. System Health, Telemetry & Security (SystemHealthTelemetryScreen)
  system_enforce_mfa: boolean;
  system_session_timeout_minutes: number;
  system_log_retention_days: number;
  system_webhook_retry_limit: number;
  system_api_threshold_ms: number;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  org_business_name: "All About Pawz",
  org_tagline: "Luxury pet grooming with love and care.",
  org_phone: "(214) 555-0198",
  org_email: "info@allaboutpawz.com",
  org_website: "https://www.allaboutpawz.com",
  org_address: "1234 Maple Drive, Frisco, TX 75034",
  org_tax_ein: "XX-XXXX789",
  org_timezone: "America/Chicago",
  org_logo_url: "",
  org_primary_color: "#000000",
  org_secondary_color: "#FFFFFF",
  org_corners: "SQUARE",
  org_accent_dim: "#F3F3F4",

  booking_allow_automatic_confirm: false,
  booking_max_horizon_days: 90,
  booking_turnaround_buffer_minutes: 15,
  booking_default_duration_minutes: 120,
  booking_overbooking_threshold_percent: 10,
  booking_cancellation_cutoff_hours: 24,
  booking_no_show_fee: 25.0,
  booking_required_vaccines: "Rabies, DHPP, Bordetella",
  booking_require_deposit: false,
  booking_deposit_percent: 25.0,
  booking_deposit_flat_amount: 0.0,

  stripe_account_id: "acct_1Oz8x...",
  stripe_connection_status: "CONNECTED",
  stripe_mode: "TEST",
  payment_tax_rate_percent: 8.25,
  payment_enable_tips: true,
  payment_allow_split_payments: true,
  payment_escrow_hold_days: 7,
  payment_commission_default_rate: 45.0,

  invoice_due_days: 14,
  invoice_late_fee_percent: 1.5,
  invoice_late_fee_days: 5,
  invoice_auto_remind_days: "3,7,14",

  portal_allow_self_cancel: true,
  portal_allow_self_reschedule: true,
  portal_show_pricing_upfront: true,
  portal_custom_domain: "booking.allaboutpawz.com",
  portal_enable_chat: true,
  portal_theme: "light",

  social_instagram_handle: "allaboutpawz",
  social_facebook_page: "allaboutpawzfb",
  social_yelp_url: "https://yelp.com/biz/all-about-pawz",
  social_google_business_id: "gmb_9823472",

  system_enforce_mfa: false,
  system_session_timeout_minutes: 60,
  system_log_retention_days: 365,
  system_webhook_retry_limit: 5,
  system_api_threshold_ms: 1000,
};
