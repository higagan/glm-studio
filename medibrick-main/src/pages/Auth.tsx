import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/product-analytics";
import { supabase } from "@/integrations/supabase/client";
import { setSentryUser, clearSentryUser, captureSupabaseError } from "@/lib/sentry";
import { hasPendingApply, getJobApplyContext, buildPostAuthReturnUrl, getAuthRedirect, clearAuthRedirect, resolveReturnPath, hasPendingPostShift, hasTaskIntent } from "@/lib/auth-redirect";
import { JobApplySummaryCard } from "@/components/auth/JobApplySummaryCard";
import type { JobApplyContext } from "@/lib/job-apply-context";

/**
 * Validates a redirect path from sessionStorage before navigating.
 * Only allows same-origin internal paths to prevent open redirect attacks.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, Chrome, Mail, Eye, EyeOff, AtSign, Key, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";

function jobAnalyticsProps(ctx: JobApplyContext) {
  return {
    jobId: ctx.id,
    jobSlug: ctx.slug || ctx.id,
    jobTitle: ctx.title,
    hospital: ctx.hospitalName,
    compensation: ctx.compensation ?? undefined,
    shiftDate: ctx.shiftDate,
  };
}

function trackAuthStarted(method: string) {
  track("auth_started", { method });
  const ctx = getJobApplyContext();
  if (ctx) {
    track("auth_started_from_job", { method, ...jobAnalyticsProps(ctx) });
  }
}

function trackAuthCompleted(method: string, extras: Record<string, string | boolean> = {}) {
  track("auth_completed", { method, ...extras });
  const ctx = getJobApplyContext();
  if (ctx) {
    track("auth_completed_from_job", { method, ...jobAnalyticsProps(ctx), ...extras });
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  // Tracks which auth method initiated this session for analytics
  const authMethodRef = useRef<string>("unknown");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phone auth state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);

  // View mode: 'signup' | 'login' | 'forgot' (only for email)
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const verifyOtpInFlight = useRef(false);
  const redirectHandledRef = useRef(false);
  const redirectInFlightRef = useRef<Promise<void> | null>(null);
  const [jobApplyContext] = useState(() => getJobApplyContext());

  const checkProfileAndRedirect = useCallback(async (userId: string, options?: { force?: boolean }) => {
    if (!options?.force && redirectHandledRef.current) return;
    if (redirectInFlightRef.current) {
      await redirectInFlightRef.current;
      return;
    }

    redirectInFlightRef.current = (async () => {
      if (!options?.force && redirectHandledRef.current) return;
      redirectHandledRef.current = true;

      const pendingRedirect = resolveReturnPath();

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();

        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        trackAuthCompleted(authMethodRef.current, {
          profileExists: !!(profile?.full_name && role),
          hasRedirect: !!pendingRedirect,
        });

        setSentryUser({
          id: userId,
          role: (role?.role as "professional" | "hospital" | "admin") ?? null,
        });

        if (!profile || !profile.full_name || !role) {
          track("profile_started", { path: "/complete-profile", source: "auth_redirect" });
          navigate("/complete-profile", { replace: true });
        } else {
          const destination = buildPostAuthReturnUrl(pendingRedirect);
          clearAuthRedirect();
          navigate(destination, { replace: true });
        }
      } catch (error: unknown) {
        const err = error as { message?: string; code?: string };
        captureSupabaseError(
          { message: err?.message || "Unknown error", code: err?.code },
          { fn: "checkProfileAndRedirect", userId }
        );
        navigate("/complete-profile", { replace: true });
      }
    })();

    try {
      await redirectInFlightRef.current;
    } finally {
      redirectInFlightRef.current = null;
    }
  }, [navigate]);

  const ensureAuthRedirect = useCallback(async (userId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (!redirectHandledRef.current) {
      await checkProfileAndRedirect(userId, { force: true });
    }
  }, [checkProfileAndRedirect]);

  useEffect(() => {
    const finishAuthRedirect = async (userId: string) => {
      await checkProfileAndRedirect(userId);
    };

    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (error) {
        track("auth_abandoned", {
          method: sessionStorage.getItem("mb_auth_method") || "oauth",
          reason: error,
          fromJobApply: !!getJobApplyContext(),
        });
        toast({
          title: "Authentication failed",
          description: errorDescription || error,
          variant: "destructive",
        });
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (accessToken) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          toast({
            title: "Session error",
            description: sessionError.message,
            variant: "destructive",
          });
          return;
        }

        if (session?.user) {
          const storedMethod = sessionStorage.getItem("mb_auth_method");
          if (storedMethod) {
            authMethodRef.current = storedMethod;
            sessionStorage.removeItem("mb_auth_method");
          }
          window.history.replaceState({}, document.title, window.location.pathname);
          await finishAuthRedirect(session.user.id);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;
      if (window.location.pathname !== "/auth") return;
      if (!hasTaskIntent() && !resolveReturnPath()) return;
      void finishAuthRedirect(session.user.id);
    });

    if (window.location.hash.includes('access_token') || window.location.hash.includes('error=')) {
      void handleAuthCallback();
      return () => subscription.unsubscribe();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      if (hasTaskIntent() || resolveReturnPath()) {
        void finishAuthRedirect(session.user.id);
        return;
      }
      setExistingUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate, checkProfileAndRedirect]);

  const fromJobApply = !!jobApplyContext;
  const fromPostShift = hasPendingPostShift();

  const handleContinueExistingSession = async () => {
    if (!existingUserId) return;
    setLoading(true);
    try {
      redirectHandledRef.current = false;
      await checkProfileAndRedirect(existingUserId, { force: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (hasPendingApply()) {
      track("auth_abandoned", {
        method: authMethodRef.current,
        reason: "signed_out_before_complete",
        fromJobApply: !!getJobApplyContext(),
      });
    }
    setLoading(true);
    try {
      await supabase.auth.signOut();
      clearSentryUser();
      setExistingUserId(null);
      toast({
        title: "Signed out",
        description: "You can sign in with a different account.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizePhoneNumber = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";

    // Keep leading '+' if present; remove spaces/dashes/parentheses elsewhere.
    const cleaned = trimmed.startsWith("+")
      ? "+" + trimmed.slice(1).replace(/[^\d]/g, "")
      : trimmed.replace(/[^\d]/g, "");

    // If user entered an Indian 10-digit mobile number, assume +91.
    if (!cleaned.startsWith("+") && cleaned.length === 10) {
      return `+91${cleaned}`;
    }

    // If user entered country code without '+', add it.
    if (!cleaned.startsWith("+") && cleaned.length > 10) {
      return `+${cleaned}`;
    }

    return cleaned;
  };

  const isLikelyE164 = (value: string) => /^\+\d{10,15}$/.test(value);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    authMethodRef.current = "email";
    trackAuthStarted("email");
    sessionStorage.setItem("mb_auth_method", "email");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (!error && data.user) {
        toast({ title: "Welcome back!", description: "Continuing where you left off…" });
        await ensureAuthRedirect(data.user.id);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: loginEmail,
        password: loginPassword,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });

      if (signUpError) throw signUpError;

      if (signUpData.session && signUpData.user) {
        await ensureAuthRedirect(signUpData.user.id);
        return;
      }

      toast({
        title: "Check your email",
        description: hasTaskIntent()
          ? "We saved your place. Open the verification link, then return here."
          : "Open the verification link in your email to continue.",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Please check your credentials and try again.";
      toast({ title: "Couldn't continue", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    authMethodRef.current = "email_signup";
    trackAuthStarted("email_signup");
    sessionStorage.setItem("mb_auth_method", "email_signup");

    if (signupPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!/[A-Z]/.test(signupPassword) || !/[0-9]/.test(signupPassword) || !/[^A-Za-z0-9]/.test(signupPassword)) {
      toast({
        title: "Weak password",
        description: "Password must include an uppercase letter, a number, and a special character.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (signupPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/complete-profile`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        trackAuthCompleted("email_signup", {
          profileExists: false,
          hasRedirect: !!resolveReturnPath(),
        });
        toast({
          title: "Account created!",
          description: authData.session
            ? "Let's finish your profile so you can apply."
            : "Please check your email to verify your account. You're one step closer to connecting with healthcare opportunities.",
        });
        if (authData.session) {
          await ensureAuthRedirect(authData.user.id);
        } else {
          toast({
            title: "Verify your email to continue",
            description: hasPendingApply()
              ? "We saved your application. Open the link in your email, then finish your profile to apply."
              : "Open the verification link in your email, then sign in to finish setup.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    authMethodRef.current = "google";
    trackAuthStarted("google");
    // Persist method across the full-page OAuth redirect (authMethodRef resets on remount)
    sessionStorage.setItem("mb_auth_method", "google");
    try {
      // Use the current origin (medibrick.com) for redirect
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      // Note: User will be redirected to Google, then back to redirectUrl
      // The useEffect will handle the callback
    } catch (error: any) {
      toast({
        title: "Google login failed",
        description: error.message || "Unable to sign in with Google.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    authMethodRef.current = "otp";
    trackAuthStarted("otp");
    sessionStorage.setItem("mb_auth_method", "otp");

    try {
      const normalized = normalizePhoneNumber(phoneNumber);
      if (!isLikelyE164(normalized)) {
        toast({
          title: "Enter a valid phone number",
          description: "Use country code format, e.g. +91XXXXXXXXXX",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });

      if (error) throw error;

      setPhoneNumber(normalized);
      setOtpSent(true);
      toast({
        title: "OTP sent!",
        description: "Please check your phone for the verification code.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please check your phone number and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtpCode(otp);
  };

  const verifyOtpCode = async (code: string) => {
    if (verifyOtpInFlight.current || loading) return;
    if (code.length !== 6) return;

    verifyOtpInFlight.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: "sms",
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Welcome!",
          description: "You've been successfully logged in. Ready to find your next opportunity.",
        });
        await ensureAuthRedirect(data.user.id);
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      verifyOtpInFlight.current = false;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (error: any) {
      toast({
        title: "Failed to send reset email",
        description: error.message || "Please check the email address and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowPhoneForm(false);
    setShowEmailForm(false);
    setOtpSent(false);
    setForgotSent(false);
    setMode("login");
    setPhoneNumber("");
    setOtp("");
    setLoginEmail("");
    setLoginPassword("");
    setSignupEmail("");
    setSignupPassword("");
    setConfirmPassword("");
    setForgotEmail("");
  };

  const showMainButtons = !showPhoneForm && !showEmailForm && !otpSent;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="hero-marketplace flex items-center justify-center px-6 py-12 md:px-10 md:py-16 min-h-[calc(100vh-73px)] border-t border-border">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className={fromJobApply || fromPostShift ? "text-center mb-6" : "text-center mb-12"}>
          <h1 className="font-bold text-foreground mb-4 font-heading text-2xl md:text-3xl">
            {fromJobApply
              ? "Apply for this shift"
              : fromPostShift
                ? "Post a shift"
                : "Continue to MediBrick"}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {fromJobApply
              ? "Sign in or create an account — takes about 30 seconds."
              : fromPostShift
                ? "Sign in to publish your shift — we'll keep you on track."
                : "Find flexible shifts or staff your facility with verified professionals."}
          </p>
          {!fromJobApply && !fromPostShift && (
            <p className="mt-5 text-sm text-muted-foreground">
              {["Verified facilities", "Your details stay private", "Apply in seconds"].map(
                (item, i) => (
                  <span key={item}>
                    {i > 0 && <span className="mx-2 text-border">·</span>}
                    {item}
                  </span>
                ),
              )}
            </p>
          )}
        </div>

        {jobApplyContext && (
          <JobApplySummaryCard job={jobApplyContext} className="mb-6" />
        )}

        {/* Back Button - Show when any form is active */}
        {!showMainButtons && (
          <div className="mb-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        )}

        {/* Three Main Buttons - Only show when no form is active */}
        {showMainButtons && (
          <div className="space-y-4 mb-8">
          {existingUserId && (
            <div className="p-6 rounded-2xl border border-border glass shadow-glass">
              <div className="text-sm font-semibold text-foreground">
                You’re already signed in
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Continue where you left off, or sign out to use a different number/email.
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleContinueExistingSession}
                  className="flex-1 h-11"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                  className="h-11"
                  disabled={loading}
                >
                  Sign out
                </Button>
              </div>
            </div>
          )}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-14 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 font-semibold text-base"
            disabled={loading}
          >
            <Chrome className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <Button
            type="button"
            onClick={() => setShowPhoneForm(true)}
            className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-base"
            disabled={loading}
          >
            <Phone className="mr-2 h-5 w-5" />
            Continue with phone
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowEmailForm(true)}
            className="w-full h-11 text-muted-foreground hover:text-foreground font-medium text-sm"
            disabled={loading}
          >
            <Mail className="mr-2 h-4 w-4" />
            More options — continue with email
          </Button>
          </div>
        )}

        {/* Phone/SMS Login Form */}
        {showPhoneForm && !otpSent && (
          <div className="mb-8 p-6 md:p-8 border border-border rounded-2xl glass shadow-glass">
            <form onSubmit={handleSendOTP} className="space-y-5">
              <Label htmlFor="phone" className="text-base font-semibold">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 77953 74024"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="h-12 pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Include country code (E.164). Example: +91XXXXXXXXXX
              </p>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 h-11 bg-primary hover:bg-primary-hover text-primary-foreground" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Verification Code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  className="h-11"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* OTP Verification */}
        {otpSent && (
          <div className="mb-8 p-6 md:p-8 border border-border rounded-2xl glass shadow-glass">
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <Label htmlFor="otp" className="text-base font-semibold">Enter verification code</Label>
              <div className="flex justify-center">
                <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (value.length === 6) {
                    void verifyOtpCode(value);
                  }
                }}
              >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Code sent to {phoneNumber}
              </p>
              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground" disabled={loading || otp.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
              >
                Change phone number
              </Button>
            </form>
          </div>
        )}

        {/* Email Form - Only shown when Email button is clicked */}
        {showEmailForm && (
          <>
            <Separator className="my-6" />
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="login-email" className="text-base font-semibold">Email</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Example@gmail.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="h-12 pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="login-password" className="text-base font-semibold">Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-12 pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleBack}
                      className="h-12"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>

              {/* Forgot Password Form */}
              {mode === "forgot" && (
                <div>
                  {forgotSent ? (
                    <div className="text-center py-4 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                        <Key className="h-6 w-6 text-success" />
                      </div>
                      <p className="font-semibold text-foreground">Check your inbox</p>
                      <p className="text-sm text-muted-foreground">
                        We sent a reset link to <span className="font-medium">{forgotEmail}</span>. Click it to set a new password.
                      </p>
                      <Button variant="ghost" className="w-full mt-2" onClick={() => { setMode("login"); setForgotSent(false); }}>
                        Back to Login
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">Forgot your password?</p>
                        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                      </div>
                      <div className="space-y-2.5">
                        <Label htmlFor="forgot-email" className="text-base font-semibold">Email</Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="Example@gmail.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1 h-12 font-semibold" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send Reset Link
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setMode("login")} className="h-12">
                          Back
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
