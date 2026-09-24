// ---------------------------------------------------------------------------
// DawgNavSection — the union of every admin/customer/groomer/frontdesk sidebar
// section id. Kept here (the shared types module) so every portal page +
// component imports the same union. Adding a new admin route? add its id here.
// ---------------------------------------------------------------------------
export type DawgNavSection =
  | "dashboard"
  | "customers"
  | "pets"
  | "appointments"
  | "grooming-records"
  | "calendar"
  | "services"
  | "staff"
  | "schedule"
  | "orders"
  | "order-details"
  | "inventory"
  | "shipping"
  | "returns"
  | "purchase-orders"
  | "products"
  | "categories"
  | "brands"
  | "filters"
  | "promotions"
  | "books"
  | "invoices"
  | "payments"
  | "deposits"
  | "refunds"
  | "gift-cards"
  | "payroll"
  | "taxes"
  | "reports"
  | "financial-settings"
  | "stripe-connections"
  | "settings"
  | "messages"
  | "pos"
  | "subscriptions"
  | "fulfillment"
  | "vendors"
  | "lms-dashboard"
  | "lms-curriculum"
  | "lms-media"
  | "lms-enrollment"
  | "lms-ai-teaching"
  | "lms-progress"
  | "lms-assessment"
  | "lms-skills"
  | "lms-support"
  | "lms-communication"
  | "lms-compliance"
  | "lms-bridge"
  | "lms-ai-instructor"

export type Area = {
  area: string;
  statute: string;
  grades: string[] | null;
  sourceExcerpt: string;
  excerptCitation: string;
  citationMatchesExcerpt: boolean;
};

export type StateSummary = {
  state: string;
  authority: string;
  mode: "require" | "recommend";
  standardStatute: string;
  curriculumEntity: string;
  areas: Area[];
};

export type Selection = {
  state: string;
  area: string;
  statute: string;
  grade: string;
};

export type CompanionSection = {
  title: string;
  lesson: string;
  workedExample: string;
  checks: string[];
};

export type Companion = {
  title: string;
  subtitle: string;
  overview: string;
  alignment: {
    state: string;
    grade: string;
    area: string;
    statute: string;
    authority: string;
    note: string;
  };
  learningObjectives: string[];
  sections: CompanionSection[];
  independentPractice: string[];
  appliedProject: {
    title: string;
    brief: string;
    deliverables: string[];
  };
  glossary: Array<{ term: string; definition: string }>;
  familyNote: string;
  sources: string[];
};

export type CourseRecord = {
  id: number;
  code: string | null;
  state: string;
  area: string;
  statute: string;
  grade: string;
  title: string;
  companion: Companion;
  model: string;
  createdAt: string;
  description?: string | null;
  longDescription?: string | null;
  category?: string | null;
  totalClockHours?: string | number | null;
  difficultyLevel?: string | null;
  slug?: string | null;
};
