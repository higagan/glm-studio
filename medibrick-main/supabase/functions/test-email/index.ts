import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://id-preview--0470c19c-90a8-4f47-b96f-12e2c0ce5fd7.lovable.app";

const brand = {
  primary: "#1E3A8A",
  primaryDark: "#162d6e",
  secondary: "#3db87a",
  accent: "#FFC300",
  heart: "#E63946",
  foreground: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bgPage: "#f0f4f8",
  bgCard: "#ffffff",
  bgSection: "#f8fafc",
};

const logoSVG = `
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 4px;">
  <tr>
    <td style="vertical-align:middle;padding-right:6px;">
      <svg width="36" height="32" viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M11,23 C11,23 3,16 3,9.5 C3,4.5 6.5,1 11,1 C12.8,1 14,1.8 14.5,3.2 C15,1.8 16.2,1 18,1 C22.5,1 26,4.5 26,9.5 C26,16 18,23 18,23 C17,24 15,25.5 14.5,25.5 C14,25.5 12,24 11,23 Z" fill="${brand.heart}"/>
        <path d="M10,18 L10,8 L14.5,14 L19,8 L19,18" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M19,18 L20,18 L21,16 L22,18 L23,16 L24,18 L25,17 L26,18 L27,16 L28,18 L29,17 L30,18 L31,18" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </td>
    <td style="vertical-align:middle;">
      <span style="font-family:'Montserrat',Arial,sans-serif;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">ediBrick</span>
    </td>
  </tr>
</table>`;

const ecgAccentLine = `<svg width="200" height="10" viewBox="0 0 200 10" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
  <path d="M0,5 L20,5 L30,2 L50,5 L70,2 L90,5 L110,3 L130,5 L150,2 L170,5 L180,3 L200,5" stroke="${brand.accent}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>`;

function emailShell(body: string): string {
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
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,${brand.primary} 0%,${brand.primaryDark} 100%);border-radius:14px 14px 0 0;padding:30px 40px 20px;text-align:center;">
            ${logoSVG}
            ${ecgAccentLine}
            <p style="margin:10px 0 0;color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Healthcare Staffing Platform</p>
          </td>
        </tr>
        <tr><td style="background:${brand.accent};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="background:${brand.bgCard};padding:40px;border-left:1px solid ${brand.border};border-right:1px solid ${brand.border};">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:${brand.primary};border-radius:0 0 14px 14px;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1px;text-transform:uppercase;">© 2025 MediBricks · Healthcare Staffing Platform</p>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.3);font-size:11px;">This is an automated notification. Please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr><td style="padding:9px 0;border-bottom:1px solid ${brand.border};">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="38%" style="color:${brand.muted};font-size:12px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;">${label}</td>
      <td style="color:${brand.foreground};font-size:14px;font-weight:700;">${value}</td>
    </tr></table>
  </td></tr>`;
}

function sectionBox(title: string, rows: string): string {
  return `<div style="background:${brand.bgSection};border:1px solid ${brand.border};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <p style="margin:0 0 14px;font-size:10px;font-weight:800;color:${brand.muted};letter-spacing:1.5px;text-transform:uppercase;">${title}</p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </div>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin-top:32px;">
    <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,${brand.primary},${brand.primaryDark});color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:14px;font-weight:800;letter-spacing:0.5px;">
      ${label} &rarr;
    </a>
  </div>`;
}

function statusBanner(accepted: boolean): string {
  const stripe = accepted ? brand.secondary : brand.heart;
  const bg = accepted ? "#f0fdf4" : "#fff1f2";
  const border = accepted ? "#86efac" : "#fda4af";
  const color = accepted ? "#166534" : "#9f1239";
  const icon = accepted ? "✓" : "✕";
  const label = accepted ? "Application Accepted" : "Application Not Progressed";
  return `<div style="background:${bg};border:1px solid ${border};border-left:5px solid ${stripe};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
    <span style="font-size:22px;font-weight:900;color:${stripe};margin-right:10px;">${icon}</span>
    <span style="font-size:15px;font-weight:800;color:${color};">${label}</span>
  </div>`;
}

function calloutBox(title: string, text: string): string {
  return `<div style="background:#eff6ff;border-left:4px solid ${brand.primary};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0 0 5px;font-size:11px;font-weight:800;color:${brand.primary};letter-spacing:0.5px;text-transform:uppercase;">${title}</p>
    <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.7;">${text}</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { emailType = "both" } = await req.json().catch(() => ({}));
  const TO = "gagan.ping@gmail.com";
  const results = [];

  const sendEmail = async (to: string, subject: string, html: string) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "MediBricks <onboarding@resend.dev>", to: [to], subject, html }),
    });
    return res.json();
  };

  // ── Email 1: Professional "Accepted" notification ─────────────────────────
  if (emailType === "accepted" || emailType === "both") {
    const positionRows =
      infoRow("Position", "Senior Cardiologist") +
      infoRow("Hospital", "Apollo Hospital, Mumbai") +
      infoRow("Location", "Mumbai, Maharashtra") +
      infoRow("Department", "Cardiology") +
      infoRow("Shift Date", "Saturday, 22 February 2025") +
      infoRow("Shift Time", "08:00 – 16:00") +
      infoRow("Compensation", "₹2,500/hour");

    const body = `
      <p style="font-size:16px;color:${brand.foreground};margin:0 0 6px;font-weight:700;">Dear Dr. Gaurav Dogra,</p>
      <p style="font-size:14px;color:${brand.muted};line-height:1.8;margin:0 0 24px;">
        We're delighted to inform you that <strong style="color:${brand.foreground};">Apollo Hospital, Mumbai</strong> has reviewed your application and decided to move forward with you. The hospital team will be in touch shortly to confirm your shift details.
      </p>
      ${statusBanner(true)}
      ${sectionBox("Shift Details", positionRows)}
      ${calloutBox("Next Steps", "The hospital will contact you directly. Log in to your MediBricks dashboard to view the full shift details and hospital contact information.")}
      ${ctaButton(`${APP_URL}/dashboard`, "View My Applications")}
    `;

    const result = await sendEmail(TO, "🎉 Your application for Senior Cardiologist has been accepted", emailShell(body));
    results.push({ type: "accepted_to_professional", result });
  }

  // ── Email 2: Hospital "New Application" notification ──────────────────────
  if (emailType === "new_application" || emailType === "both") {
    const positionRows =
      infoRow("Position", "Senior Cardiologist") +
      infoRow("Department", "Cardiology") +
      infoRow("Shift Date", "Saturday, 22 February 2025") +
      infoRow("Shift Time", "08:00 – 16:00");

    const applicantRows =
      infoRow("Name", "Dr. Gaurav Dogra") +
      infoRow("Specialization", "Cardiology") +
      infoRow("Experience", "8 years");

    const body = `
      <p style="font-size:16px;color:${brand.foreground};margin:0 0 6px;font-weight:700;">Dear Apollo Hospital Team,</p>
      <p style="font-size:14px;color:${brand.muted};line-height:1.8;margin:0 0 24px;">
        A healthcare professional has submitted an application for one of your open shifts on <strong style="color:${brand.foreground};">MediBricks</strong>. Please review their profile and respond at your earliest convenience.
      </p>
      ${sectionBox("Shift Details", positionRows)}
      ${sectionBox("Applicant Profile", applicantRows)}
      <div style="background:${brand.bgSection};border:1px solid ${brand.border};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:10px;font-weight:800;color:${brand.muted};letter-spacing:1.5px;text-transform:uppercase;">Cover Letter</p>
        <p style="margin:0;font-size:14px;color:#334155;line-height:1.8;font-style:italic;">"I am a board-certified cardiologist with 8 years of experience in interventional cardiology. I have worked in high-volume cardiac centres across India and am fully comfortable working independently during shifts. I am available for the requested shift and look forward to contributing to your team."</p>
      </div>
      ${calloutBox("Action Required", "Log in to your MediBricks dashboard to view the complete applicant profile and accept or reject this application.")}
      ${ctaButton(`${APP_URL}/dashboard`, "Review Application")}
    `;

    const result = await sendEmail(TO, `New Application — Senior Cardiologist · Dr. Gaurav Dogra`, emailShell(body));
    results.push({ type: "new_application_to_hospital", result });
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
