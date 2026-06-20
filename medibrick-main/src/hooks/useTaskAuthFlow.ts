import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/product-analytics";
import { useToast } from "@/hooks/use-toast";
import { normalizePhoneNumber, isLikelyE164, storeAuthMethod } from "@/lib/auth-methods";
import { fetchOnboardingStatus } from "@/lib/onboarding-status";
import { saveJobApplyRedirect, savePostShiftIntent } from "@/lib/auth-redirect";

export type TaskAuthIntent = "apply" | "post_shift";

type JobLike = {
  id: string;
  slug?: string | null;
  title: string;
  hospital_profiles?: { hospital_name?: string } | null;
  compensation?: number | null;
  shift_date: string;
};

export function useTaskAuthFlow() {
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [intent, setIntent] = useState<TaskAuthIntent>("apply");
  const [activeJob, setActiveJob] = useState<JobLike | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);
  const verifyInFlight = useRef(false);

  const completeFlow = useCallback(() => {
    setAuthOpen(false);
    setOnboardingOpen(false);
    onCompleteRef.current?.();
    onCompleteRef.current = null;
  }, []);

  const afterAuthSuccess = useCallback(
    async (userId: string) => {
      const status = await fetchOnboardingStatus(userId);
      if (!status.isComplete) {
        setAuthOpen(false);
        setOnboardingOpen(true);
        return;
      }
      completeFlow();
    },
    [completeFlow],
  );

  const startApplyFlow = useCallback((job: JobLike, onComplete: () => void) => {
    saveJobApplyRedirect(job);
    setIntent("apply");
    setActiveJob(job);
    onCompleteRef.current = onComplete;
    setOnboardingOpen(false);
    setAuthOpen(true);
  }, []);

  const startPostShiftFlow = useCallback((onComplete: () => void) => {
    savePostShiftIntent();
    setIntent("post_shift");
    setActiveJob(null);
    onCompleteRef.current = onComplete;
    setOnboardingOpen(false);
    setAuthOpen(true);
  }, []);

  const handleGoogleAuth = useCallback(async () => {
    storeAuthMethod("google");
    track("auth_started", { method: "google", intent });
    const redirectUrl = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) throw error;
  }, [intent]);

  const handleSendOtp = useCallback(
    async (phone: string) => {
      storeAuthMethod("otp");
      track("auth_started", { method: "otp", intent });
      const normalized = normalizePhoneNumber(phone);
      if (!isLikelyE164(normalized)) {
        throw new Error("Use country code format, e.g. +91XXXXXXXXXX");
      }
      const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (error) throw error;
      return normalized;
    },
    [intent],
  );

  const handleVerifyOtp = useCallback(
    async (phone: string, code: string) => {
      if (verifyInFlight.current) return;
      verifyInFlight.current = true;
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: code,
          type: "sms",
        });
        if (error) throw error;
        if (data.user) {
          track("auth_completed", { method: "otp", intent });
          await afterAuthSuccess(data.user.id);
        }
      } finally {
        verifyInFlight.current = false;
      }
    },
    [afterAuthSuccess, intent],
  );

  const handleEmailContinue = useCallback(
    async (email: string, password: string) => {
      storeAuthMethod("email");
      track("auth_started", { method: "email", intent });

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        track("auth_completed", { method: "email_login", intent });
        await afterAuthSuccess(data.user.id);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });

      if (signUpError) throw signUpError;

      if (signUpData.session && signUpData.user) {
        track("auth_completed", { method: "email_signup", intent });
        await afterAuthSuccess(signUpData.user.id);
        return;
      }

      toast({
        title: "Check your email",
        description: "We sent a verification link. Open it, then return here to continue.",
      });
    },
    [afterAuthSuccess, intent, toast],
  );

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingOpen(false);
    completeFlow();
  }, [completeFlow]);

  const startOnboardingOnly = useCallback(
    (taskIntent: TaskAuthIntent, onComplete: () => void, job?: JobLike) => {
      if (taskIntent === "apply" && job) {
        saveJobApplyRedirect(job);
        setActiveJob(job);
      }
      if (taskIntent === "post_shift") {
        savePostShiftIntent();
      }
      setIntent(taskIntent);
      onCompleteRef.current = onComplete;
      setAuthOpen(false);
      setOnboardingOpen(true);
    },
    [],
  );

  return {
    authOpen,
    setAuthOpen,
    onboardingOpen,
    setOnboardingOpen,
    intent,
    activeJob,
    startApplyFlow,
    startPostShiftFlow,
    startOnboardingOnly,
    handleGoogleAuth,
    handleSendOtp,
    handleVerifyOtp,
    handleEmailContinue,
    handleOnboardingComplete,
    afterAuthSuccess,
  };
}
