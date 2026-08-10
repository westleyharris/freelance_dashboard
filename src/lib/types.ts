/**
 * Hand-maintained mirror of supabase/migrations/0001_init.sql.
 *
 * Regenerate with the Supabase CLI once the project is linked:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/types.ts
 */

export type ProspectStage =
  | "new"
  | "attempting"
  | "contacted"
  | "interested"
  | "quoted"
  | "won"
  | "lost";

export type LostReason =
  | "not_interested"
  | "not_icp"
  | "has_website"
  | "bad_number"
  | "no_budget"
  | "using_someone_else"
  | "no_answer_exhausted"
  | "other";

export type CallOutcome =
  | "no_answer"
  | "voicemail"
  | "spoke"
  | "gatekeeper"
  | "callback_scheduled"
  | "bad_number"
  | "wrong_number"
  | "not_interested"
  | "texted"
  | "emailed";

export type WebsiteStatus =
  | "none"
  | "social_only"
  | "sitebuilder"
  | "has_website"
  | "unknown";

export type ClientStatus = "active" | "past" | "prospective";

export type ProjectType =
  | "website"
  | "mobile_app"
  | "crm_integration"
  | "crm_build"
  | "maintenance"
  | "other";

export type ProjectStatus =
  | "intake"
  | "design"
  | "build"
  | "review"
  | "launched"
  | "on_hold"
  | "cancelled";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface Prospect {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  city: string | null;
  description: string | null;
  why_reliable: string | null;
  source: string | null;
  source_url: string | null;
  website_status: WebsiteStatus;
  stage: ProspectStage;
  lost_reason: LostReason | null;
  quoted_amount: number | null;
  next_action_at: string | null;
  last_contacted_at: string | null;
  call_count: number;
  legacy_attempts: number | null;
  chamber_member: boolean;
  /** Generated in Postgres — read-only here. See icp_*_points() in the schema. */
  icp_score: number;
  place_id: string | null;
  /** Places API regularOpeningHours. Null means never fetched. */
  opening_hours: import("./hours").OpeningHours | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  prospect_id: string;
  called_at: string;
  outcome: CallOutcome;
  notes: string | null;
  duration_mins: number | null;
  created_at: string;
}

export interface Client {
  id: string;
  prospect_id: string | null;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  price: number | null;
  started_on: string | null;
  launched_on: string | null;
  live_url: string | null;
  repo_url: string | null;
  domain: string | null;
  domain_registrar: string | null;
  hosting: string | null;
  form_endpoint: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeForm {
  id: string;
  client_id: string | null;
  project_id: string | null;
  token: string;
  business_name: string | null;
  what_business_does: string | null;
  best_contact: string | null;
  service_area: string | null;
  pages_wanted: string[] | null;
  reference_sites: string | null;
  has_content: string | null;
  special_requests: string | null;
  anything_else: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  amount: number;
  status: InvoiceStatus;
  description: string | null;
  issued_on: string | null;
  due_on: string | null;
  paid_on: string | null;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------
 * Display labels
 * ---------------------------------------------------------------------- */

export const STAGE_LABELS: Record<ProspectStage, string> = {
  new: "Not called yet",
  attempting: "Trying to reach",
  contacted: "Spoke with them",
  interested: "Interested",
  quoted: "Quote / demo sent",
  won: "Won",
  lost: "Closed out",
};

/** Ordered for the pipeline board, cold to closed. */
export const STAGE_ORDER: ProspectStage[] = [
  "new",
  "attempting",
  "contacted",
  "interested",
  "quoted",
  "won",
  "lost",
];

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  not_interested: "Not interested",
  not_icp: "Not a fit",
  has_website: "Already has a website",
  bad_number: "Bad / disconnected number",
  no_budget: "No budget",
  using_someone_else: "Using someone else",
  no_answer_exhausted: "Never reached them",
  other: "Other",
};

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "No answer",
  voicemail: "Left voicemail",
  spoke: "Spoke with them",
  gatekeeper: "Gatekeeper",
  callback_scheduled: "Callback scheduled",
  bad_number: "Bad number",
  wrong_number: "Wrong number",
  not_interested: "Not interested",
  texted: "Sent a text",
  emailed: "Sent an email",
};

/** Outcomes that mean a human actually picked up — drives the connect rate. */
export const CONNECTED_OUTCOMES: CallOutcome[] = [
  "spoke",
  "gatekeeper",
  "callback_scheduled",
  "not_interested",
];

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  none: "No website",
  social_only: "Social media only",
  sitebuilder: "Wix / sitebuilder",
  has_website: "Has a website",
  unknown: "Unknown",
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  website: "Website",
  mobile_app: "Mobile app",
  crm_integration: "CRM integration",
  crm_build: "CRM build",
  maintenance: "Maintenance",
  other: "Other",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  intake: "Intake",
  design: "Design",
  build: "Build",
  review: "Client review",
  launched: "Launched",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  past: "Past",
  prospective: "Prospective",
};

/* -------------------------------------------------------------------------
 * ICP scoring
 * ---------------------------------------------------------------------- */

/**
 * Categories worth calling, grouped by how their customer buys. Offered as
 * suggestions on the new-prospect form; the score matches on substrings, so
 * typing something not on this list still lands in a sensible tier.
 */
export const CATEGORY_SUGGESTIONS = {
  "Best fit — planned, visual purchases": [
    "Events",
    "Party Rentals",
    "Photography",
    "Wedding Services",
    "Signs",
    "Handyman",
    "Remodeling",
    "Custom Cabinetry",
    "Fencing",
    "Pet Services",
    "Med Spa",
  ],
  "Worth a call": [
    "Auto Detailing",
    "Barber",
    "Hair & Beauty",
    "Cleaning",
    "Fitness",
    "Boutique Retail",
    "Junk Removal",
    "Moving",
  ],
  "Rarely converts — emergency or walk-in": [
    "Plumbing",
    "Roofing",
    "HVAC",
    "Electrical",
    "Tree Service",
    "Lawn Care",
    "Pressure Washing",
    "Gutter Cleaning",
    "Food & Drink",
  ],
} as const;

export function scoreBand(score: number): {
  label: string;
  tone: string;
} {
  if (score >= 70) return { label: "Strong fit", tone: "bg-good-soft text-good" };
  if (score >= 45) return { label: "Worth calling", tone: "bg-warn-soft text-warn" };
  if (score >= 25) return { label: "Marginal", tone: "bg-surface-2 text-ink-muted" };
  return { label: "Poor fit", tone: "bg-bad-soft text-bad" };
}

/** The page checklist from Client Website Intake Form.docx. */
export const PAGE_OPTIONS = [
  "Home",
  "About",
  "Services",
  "Contact",
  "Photos",
  "Reviews",
] as const;
