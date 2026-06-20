export function buildRecoveryMessage(params: {
  name: string;
  dropoffStage: string;
  jobId?: string | null;
}): string {
  const firstName = params.name.split(" ")[0] || "there";
  const jobHint = params.jobId ? ` for the shift you viewed` : "";

  switch (params.dropoffStage) {
    case "OTP":
      return `Hi ${firstName}, we noticed you started signing in on Medibrick but didn't finish. Did you face any issue with OTP verification? We'd be happy to help you complete your application.`;
    case "Profile Completion":
      return `Hi ${firstName}, you were almost done setting up your Medibrick profile${jobHint}. Can we help you finish? It only takes a minute.`;
    case "Application Submission":
      return `Hi ${firstName}, we noticed you started applying${jobHint} on Medibrick but didn't submit. Did you face any issue? We'd be happy to help.`;
    case "Apply Click":
      return `Hi ${firstName}, you showed interest in a shift on Medibrick. Would you like help completing your application? We're here if you have any questions.`;
    case "Job View":
      return `Hi ${firstName}, we saw you browsing shifts on Medibrick. Is there a particular role you're looking for? Happy to help you find the right fit.`;
    case "Hospital Signup":
      return `Hi ${firstName}, thanks for starting hospital signup on Medibrick. Can we help you finish posting your first shift?`;
    case "Job Creation":
      return `Hi ${firstName}, your hospital profile is set up on Medibrick — would you like help publishing your first job?`;
    default:
      return `Hi ${firstName}, we noticed you visited Medibrick recently. Did you face any issue? We'd be happy to help.`;
  }
}

export function whatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatSecondsAgo(seconds: number): string {
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
