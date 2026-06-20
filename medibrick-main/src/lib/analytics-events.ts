/** Canonical product analytics event catalog (Founder Analytics V2). */

export const ANALYTICS_EVENTS = {
  // Discovery
  page_view: "page_view",
  job_viewed: "job_viewed",
  hospital_profile_viewed: "hospital_profile_viewed",
  hospital_review_read: "hospital_review_read",
  hospital_view_shifts_clicked: "hospital_view_shifts_clicked",
  hospital_followed: "hospital_followed",
  hospital_apply_started: "hospital_apply_started",
  hospital_jobs_viewed: "hospital_jobs_viewed",
  search_performed: "search_performed",
  filter_applied: "filter_applied",
  // Engagement
  job_shared: "job_shared",
  hospital_shared: "hospital_shared",
  maps_opened: "maps_opened",
  nearby_page_viewed: "nearby_page_viewed",
  location_permission_granted: "location_permission_granted",
  nearby_shift_clicked: "nearby_shift_clicked",
  // Application funnel
  apply_clicked: "apply_clicked",
  apply_requires_auth: "apply_requires_auth",
  apply_resumed_after_auth: "apply_resumed_after_auth",
  auth_started: "auth_started",
  auth_completed: "auth_completed",
  auth_abandoned: "auth_abandoned",
  auth_started_from_job: "auth_started_from_job",
  auth_completed_from_job: "auth_completed_from_job",
  profile_started: "profile_started",
  profile_completed: "profile_completed",
  application_started: "application_started",
  application_submitted: "application_submitted",
  // Hospital funnel
  hospital_signup_started: "hospital_signup_started",
  hospital_signup_completed: "hospital_signup_completed",
  job_created: "job_created",
  job_published: "job_published",
  // Ops / legacy
  application_dialog_opened: "application_dialog_opened",
  application_dialog_cancelled: "application_dialog_cancelled",
  back_to_list_clicked: "back_to_list_clicked",
  hospital_viewed: "hospital_viewed",
  professional_accepted: "professional_accepted",
  professional_rejected: "professional_rejected",
  error_boundary_triggered: "error_boundary_triggered",
  verification_started: "verification_started",
  verification_document_uploaded: "verification_document_uploaded",
  verification_submitted: "verification_submitted",
  verification_approved: "verification_approved",
  verification_rejected: "verification_rejected",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const APPLICATION_FUNNEL_EVENTS = [
  ANALYTICS_EVENTS.job_viewed,
  ANALYTICS_EVENTS.apply_clicked,
  ANALYTICS_EVENTS.auth_started,
  ANALYTICS_EVENTS.auth_completed,
  ANALYTICS_EVENTS.profile_started,
  ANALYTICS_EVENTS.profile_completed,
  ANALYTICS_EVENTS.application_started,
  ANALYTICS_EVENTS.application_submitted,
] as const;

export const TRAFFIC_SOURCES = ["google", "whatsapp", "direct", "referral", "linkedin"] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];
