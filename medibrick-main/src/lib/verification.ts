import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export const VERIFICATION_META: Record<
  VerificationStatus,
  { label: string; tone: "muted" | "warning" | "success" | "destructive"; description: string }
> = {
  unverified: {
    label: "Not verified",
    tone: "muted",
    description: "Submit your credentials to earn a verified badge hospitals trust.",
  },
  pending: {
    label: "Under review",
    tone: "warning",
    description: "We're reviewing your credentials. This usually takes 1–2 business days.",
  },
  verified: {
    label: "Verified",
    tone: "success",
    description: "Your credentials are verified. Hospitals see your verified badge.",
  },
  rejected: {
    label: "Needs attention",
    tone: "destructive",
    description: "We couldn't verify your last submission. Update your details and resubmit.",
  },
};

export function normalizeVerificationStatus(value: unknown): VerificationStatus {
  return value === "pending" || value === "verified" || value === "rejected"
    ? value
    : "unverified";
}

const BUCKET = "verification-docs";

/** Upload a credential document to the user's private folder, returning its storage path. */
export async function uploadVerificationDocument(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${userId}/license-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

/** Submit credentials for review. The DB trigger stamps verification_submitted_at. */
export async function submitVerification(
  userId: string,
  licenseNumber: string,
  documentPath: string
): Promise<void> {
  const { error } = await supabase
    .from("professional_profiles")
    .update({
      license_number: licenseNumber,
      verification_document_url: documentPath,
      verification_status: "pending",
    })
    .eq("user_id", userId);
  if (error) throw error;
}

export interface PendingVerification {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  specialization: string | null;
  experience_years: number | null;
  license_number: string | null;
  verification_document_url: string | null;
  verification_submitted_at: string | null;
}

export async function listPendingVerifications(): Promise<PendingVerification[]> {
  const { data, error } = await supabase.rpc("list_pending_verifications");
  if (error) throw error;
  return (data ?? []) as PendingVerification[];
}

export async function reviewVerification(
  profileId: string,
  approve: boolean,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc("review_professional_verification", {
    p_profile_id: profileId,
    p_approve: approve,
    p_notes: notes ?? undefined,
  });
  if (error) throw error;
}

/** Short-lived signed URL so an admin can view a private credential document. */
export async function signedDocumentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) return null;
  return data?.signedUrl ?? null;
}
