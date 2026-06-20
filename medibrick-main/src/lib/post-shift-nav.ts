import { savePostShiftIntent } from "@/lib/auth-redirect";

/** Call before navigating logged-out users to /auth for post-shift CTAs. */
export function navigateToPostShiftAuth(navigate: (path: string) => void) {
  savePostShiftIntent();
  navigate("/auth");
}
