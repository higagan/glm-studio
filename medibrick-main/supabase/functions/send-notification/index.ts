import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  type: "application_status_changed" | "new_application";
  applicationId: string;
}

const APP_URL = Deno.env.get("APP_URL") || "https://id-preview--0470c19c-90a8-4f47-b96f-12e2c0ce5fd7.lovable.app";

// ── Brand colors (exact match from index.css) ─────────────────────────────────
const brand = {
  primary: "#1E3A8A",        // hsl(224 76% 33%) — Deep Indigo
  primaryDark: "#162d6e",    // hsl(224 76% 25%) — darker shade
  secondary: "#3db87a",      // hsl(152 44% 49%) — Sage Green
  accent: "#FFC300",         // hsl(45 100% 51%) — Warm Gold
  heart: "#E63946",          // Medical red (logo heart)
  foreground: "#0f172a",     // hsl(222 47% 11%)
  muted: "#64748b",          // muted foreground
  border: "#e2e8f0",         // hsl(220 13% 90%)
  bgPage: "#f0f4f8",         // email page background
  bgCard: "#ffffff",
  bgSection: "#f8fafc",
};

// ── Logo as inline SVG (matches MediBricksLogo.tsx exactly) ─────────────────
const logoSVG = `
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 4px;">
  <tr>
    <td style="vertical-align:middle;padding-right:6px;">
      <svg width="36" height="32" viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg">
        <!-- Heart -->
        <path d="M11,23 C11,23 3,16 3,9.5 C3,4.5 6.5,1 11,1 C12.8,1 14,1.8 14.5,3.2 C15,1.8 16.2,1 18,1 C22.5,1 26,4.5 26,9.5 C26,16 18,23 18,23 C17,24 15,25.5 14.5,25.5 C14,25.5 12,24 11,23 Z" fill="${brand.heart}"/>
        <!-- M letter -->
        <path d="M10,18 L10,8 L14.5,14 L19,8 L19,18" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <!-- ECG line -->
        <path d="M19,18 L20,18 L21,16 L22,18 L23,16 L24,18 L25,17 L26,18 L27,16 L28,18 L29,17 L30,18 L31,18" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </td>
    <td style="vertical-align:middle;">
      <span style="font-family:'Montserrat',Arial,sans-serif;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">ediBrick</span>
    </td>
  </tr>
</table>
`;

// ── ECG accent line (brand signature) ────────────────────────────────────────
const ecgAccentLine = `
<svg width="200" height="10" viewBox="0 0 200 10" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 0;">
  <path d="M0,5 L20,5 L30,2 L50,5 L70,2 L90,5 L110,3 L130,5 L150,2 L170,5 L180,3 L200,5"
    stroke="${brand.accent}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`;

// ── Email shell ───────────────────────────────────────────────────────────────
function emailShell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>MediBricks</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background-color:${brand.bgPage};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${brand.bgPage};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- ══ HEADER ══ -->
          <tr>
            <td style="background:linear-gradient(135deg,${brand.primary} 0%,${brand.primaryDark} 100%);border-radius:14px 14px 0 0;padding:30px 40px 20px;text-align:center;">
              ${logoSVG}
              ${ecgAccentLine}
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;">Healthcare Staffing Platform</p>
            </td>
          </tr>

          <!-- ══ GOLD ACCENT BAR ══ -->
          <tr>
            <td style="background:${brand.accent};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- ══ BODY ══ -->
          <tr>
            <td style="background:${brand.bgCard};padding:40px;border-left:1px solid ${brand.border};border-right:1px solid ${brand.border};">
              ${bodyContent}
            </td>
          </tr>

          <!-- ══ FOOTER ══ -->
          <tr>
            <td style="background:${brand.primary};border-radius:0 0 14px 14px;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;">© 2025 MediBricks · Healthcare Staffing Platform</p>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.3);font-size:11px;font-family:'Helvetica Neue',Arial,sans-serif;">This is an automated notification. Please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid ${brand.border};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="38%" style="color:${brand.muted};font-size:12px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;">${label}</td>
          <td style="color:${brand.foreground};font-size:14px;font-weight:700;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function sectionBox(title: string, rows: string): string {
  return `<div style="background:${brand.bgSection};border:1px solid ${brand.border};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <p style="margin:0 0 14px;font-size:10px;font-weight:800;color:${brand.muted};letter-spacing:1.5px;text-transform:uppercase;">${title}</p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </div>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin-top:32px;">
    <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,${brand.primary},${brand.primaryDark});color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:14px;font-weight:800;letter-spacing:0.5px;font-family:'Helvetica Neue',Arial,sans-serif;">
      ${label} &rarr;
    </a>
  </div>`;
}

function statusBanner(accepted: boolean): string {
  const bg = accepted ? "#f0fdf4" : "#fff1f2";
  const border = accepted ? brand.secondary : "#fda4af";
  const color = accepted ? "#166534" : "#9f1239";
  const stripe = accepted ? brand.secondary : "#e63946";
  const icon = accepted ? "✓" : "✕";
  const label = accepted ? "Application Accepted" : "Application Not Progressed";
  return `<div style="background:${bg};border:1px solid ${border};border-left:5px solid ${stripe};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
    <span style="font-size:22px;font-weight:900;color:${stripe};line-height:1;">${icon}</span>
    <span style="font-size:15px;font-weight:800;color:${color};font-family:'Helvetica Neue',Arial,sans-serif;">${label}</span>
  </div>`;
}

function calloutBox(title: string, text: string, color: string = brand.primary): string {
  return `<div style="background:#eff6ff;border-left:4px solid ${color};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0 0 5px;font-size:12px;font-weight:800;color:${color};letter-spacing:0.5px;text-transform:uppercase;">${title}</p>
    <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.7;">${text}</p>
  </div>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const payload: NotificationPayload = await req.json();
  const { type, applicationId } = payload;

  const { data: application, error: appError } = await supabase
    .from("applications")
    .select(`
      id, status, cover_letter, professional_id, job_id,
      job_posts (
        id, title, department, shift_date, shift_start_time, shift_end_time, compensation, hospital_id,
        hospital_profiles ( hospital_name, city, state, address, user_id )
      ),
      professional_profiles ( id, specialization, experience_years, user_id )
    `)
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return new Response(JSON.stringify({ error: "Application not found", details: appError }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const job = application.job_posts as any;
  const hospital = job?.hospital_profiles as any;
  const professional = application.professional_profiles as any;

  const [{ data: professionalProfile }, { data: hospitalProfile }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", professional?.user_id).single(),
    supabase.from("profiles").select("full_name, email").eq("id", hospital?.user_id).single(),
  ]);

  const sendEmail = async (to: string, subject: string, html: string) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "MediBricks <onboarding@resend.dev>", to: [to], subject, html }),
    });
    return { ok: res.ok, data: await res.json() };
  };

  const logNotification = async (
    notifType: string,
    status: "success" | "failed",
    recipient: string | null,
    errorMessage?: string
  ) => {
    await supabase.from("notification_delivery_log").insert({
      notification_type: notifType,
      application_id: applicationId,
      recipient,
      status,
      error_message: errorMessage ?? null,
    });
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatTime = (t: string) => t?.slice(0, 5) ?? "—";

  const results: any[] = [];

  // ── Application status changed → email to professional ────────────────────
  if (type === "application_status_changed") {
    const isAccepted = application.status === "accepted";
    const subject = isAccepted
      ? `🎉 Your application for ${job?.title} has been accepted`
      : `Update on your application — ${job?.title}`;

    const location = [hospital?.city, hospital?.state].filter(Boolean).join(", ");

    const positionRows =
      infoRow("Position", job?.title ?? "—") +
      infoRow("Hospital", hospital?.hospital_name ?? "—") +
      infoRow("Location", location || "—") +
      infoRow("Department", job?.department ?? "—") +
      infoRow("Shift Date", job?.shift_date ? formatDate(job.shift_date) : "—") +
      infoRow("Shift Time", `${formatTime(job?.shift_start_time)} – ${formatTime(job?.shift_end_time)}`) +
      (job?.compensation ? infoRow("Compensation", `₹${job.compensation}/hour`) : "");

    const body = `
      <p style="font-size:16px;color:${brand.foreground};margin:0 0 6px;font-weight:700;font-family:'Helvetica Neue',Arial,sans-serif;">Dear ${professionalProfile?.full_name ?? "Healthcare Professional"},</p>
      <p style="font-size:14px;color:${brand.muted};line-height:1.8;margin:0 0 24px;">
        ${isAccepted
          ? `We're delighted to inform you that <strong style="color:${brand.foreground};">${hospital?.hospital_name}</strong> has reviewed your application and decided to move forward with you. The hospital team will be in touch shortly to confirm your shift details.`
          : `Thank you for applying through MediBricks. After careful consideration, <strong style="color:${brand.foreground};">${hospital?.hospital_name}</strong> has decided not to proceed with your application for this role. We encourage you to keep exploring other open shifts on the platform.`
        }
      </p>
      ${statusBanner(isAccepted)}
      ${sectionBox("Shift Details", positionRows)}
      ${isAccepted ? calloutBox("Next Steps", "The hospital will contact you directly. Log in to your dashboard to view the full shift details and hospital contact information.") : ""}
      ${ctaButton(`${APP_URL}/dashboard`, isAccepted ? "View My Applications" : "Browse Other Shifts")}
    `;

    if (professionalProfile?.email) {
      const result = await sendEmail(professionalProfile.email, subject, emailShell(body));
      if (result.ok) {
        await logNotification("application_status_changed", "success", professionalProfile.email);
      } else {
        await logNotification(
          "application_status_changed",
          "failed",
          professionalProfile.email,
          JSON.stringify(result.data)
        );
      }
      results.push({ to: "professional", email: professionalProfile.email, result: result.data });
    }
  }

  // ── New application → email to hospital ───────────────────────────────────
  if (type === "new_application") {
    const professionalName = professionalProfile?.full_name ?? "A Healthcare Professional";
    const subject = `New Application — ${job?.title} · ${professionalName}`;

    const positionRows =
      infoRow("Position", job?.title ?? "—") +
      infoRow("Department", job?.department ?? "—") +
      infoRow("Shift Date", job?.shift_date ? formatDate(job.shift_date) : "—") +
      infoRow("Shift Time", `${formatTime(job?.shift_start_time)} – ${formatTime(job?.shift_end_time)}`);

    const applicantRows =
      infoRow("Name", professionalName) +
      infoRow("Specialization", professional?.specialization ?? "—") +
      (professional?.experience_years ? infoRow("Experience", `${professional.experience_years} years`) : "");

    const coverLetterBlock = application.cover_letter
      ? `<div style="background:${brand.bgSection};border:1px solid ${brand.border};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:800;color:${brand.muted};letter-spacing:1.5px;text-transform:uppercase;">Cover Letter</p>
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.8;font-style:italic;">"${application.cover_letter}"</p>
        </div>`
      : "";

    const body = `
      <p style="font-size:16px;color:${brand.foreground};margin:0 0 6px;font-weight:700;font-family:'Helvetica Neue',Arial,sans-serif;">Dear ${hospitalProfile?.full_name ?? hospital?.hospital_name ?? "Team"},</p>
      <p style="font-size:14px;color:${brand.muted};line-height:1.8;margin:0 0 24px;">
        A healthcare professional has submitted an application for one of your open shifts on <strong style="color:${brand.foreground};">MediBricks</strong>. Please review their profile and respond at your earliest convenience.
      </p>
      ${sectionBox("Shift Details", positionRows)}
      ${sectionBox("Applicant Profile", applicantRows)}
      ${coverLetterBlock}
      ${calloutBox("Action Required", "Log in to your MediBricks dashboard to view the complete applicant profile and accept or reject this application.")}
      ${ctaButton(`${APP_URL}/dashboard`, "Review Application")}
    `;

    if (hospitalProfile?.email) {
      const result = await sendEmail(hospitalProfile.email, subject, emailShell(body));
      if (result.ok) {
        await logNotification("new_application", "success", hospitalProfile.email);
      } else {
        await logNotification(
          "new_application",
          "failed",
          hospitalProfile.email,
          JSON.stringify(result.data)
        );
      }
      results.push({ to: "hospital", email: hospitalProfile.email, result: result.data });
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  } catch (err) {
    console.error("[send-notification] unhandled error:", err);
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("notification_delivery_log").insert({
        notification_type: "unhandled",
        status: "failed",
        error_message: String(err),
      });
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
