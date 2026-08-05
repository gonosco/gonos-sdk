/**
 * SDK response models — hand-written mirrors of the server schemas.
 *
 * @deprecated Prefer the generated aliases in ``./api-types.ts`` for
 * spec-accurate field typing. These hand-written interfaces cover the
 * happy-path shape but under-report optional/nullable fields the API
 * actually returns. They stay for backward compatibility with pre-0.2
 * SDK consumers; new code should use ``CandidateResponse`` /
 * ``CheckResponse`` / ``WebhookEndpointResponse`` / etc. instead.
 *
 * Each interface carries an index signature (`[key: string]: unknown`) so
 * forward-compatible fields the API may add are preserved and accessible,
 * mirroring the Python models' `extra="allow"`. Dates are ISO-8601 strings
 * (as they arrive over the wire); parse with `new Date(...)` if needed.
 */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  [key: string]: unknown;
}

export interface Candidate {
  id: string;
  external_id?: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ConsentSession {
  id: string;
  candidate_id: string;
  check_id?: string | null;
  status: string;
  token?: string | null;
  /** #651: hosted URL where the candidate signs consent. Populated only
   *  on the creation response. Prefer this over any legacy ``consent_url``. */
  hosted_url?: string | null;
  /** @deprecated Always null — use ``hosted_url``. Kept for backward compat. */
  consent_url?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Check {
  id: string;
  candidate_id: string;
  organization_id: string;
  package?: string | null;
  status: string;
  permissible_purpose?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  [key: string]: unknown;
}

export interface CheckItem {
  id: string;
  check_id: string;
  item_type: string;
  source: string;
  status: string;
  results?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface Report {
  id: string;
  check_id: string;
  status: string;
  disposition?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface AdverseAction {
  id: string;
  check_id: string;
  report_id?: string | null;
  status: string;
  adverse_reasons?: string[] | null;
  waiting_period_days?: number | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events?: string[] | null;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface Dispute {
  id: string;
  check_id: string;
  report_id?: string | null;
  status: string;
  explanation?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Invoice {
  id: string;
  amount_cents: number;
  status: string;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Export {
  id: string;
  export_type: string;
  status: string;
  download_url?: string | null;
  created_at: string;
  [key: string]: unknown;
}
