import { useState } from "react";
import { Chrome, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { JobApplySummaryCard } from "@/components/auth/JobApplySummaryCard";
import { jobToApplyContext } from "@/lib/job-apply-context";
import type { TaskAuthIntent } from "@/hooks/useTaskAuthFlow";
import { useToast } from "@/hooks/use-toast";

type JobLike = {
  id: string;
  slug?: string | null;
  title: string;
  hospital_profiles?: { hospital_name?: string } | null;
  compensation?: number | null;
  shift_date: string;
};

type TaskAuthSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: TaskAuthIntent;
  job?: JobLike | null;
  onGoogleAuth: () => Promise<void>;
  onSendOtp: (phone: string) => Promise<string>;
  onVerifyOtp: (phone: string, code: string) => Promise<void>;
  onEmailContinue: (email: string, password: string) => Promise<void>;
};

export function TaskAuthSheet({
  open,
  onOpenChange,
  intent,
  job,
  onGoogleAuth,
  onSendOtp,
  onVerifyOtp,
  onEmailContinue,
}: TaskAuthSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const reset = () => {
    setPhone("");
    setNormalizedPhone("");
    setOtp("");
    setOtpSent(false);
    setShowEmail(false);
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const title =
    intent === "apply" ? "Apply for this shift" : "Post a shift";
  const subtitle =
    intent === "apply"
      ? "Continue in seconds — we'll bring you right back to apply."
      : "Sign in to publish your shift — takes about 30 seconds.";

  const jobContext = job ? jobToApplyContext(job) : null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto px-6 pb-8">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-xl font-heading">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        {jobContext && <JobApplySummaryCard job={jobContext} className="mb-5" />}

        {!otpSent && !showEmail && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-800 border-2 font-semibold"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await onGoogleAuth();
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Google sign-in failed";
                  toast({ title: "Couldn't continue with Google", description: msg, variant: "destructive" });
                  setLoading(false);
                }
              }}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-auth-phone" className="text-sm font-medium">
                Phone number
              </Label>
              <div className="flex gap-2">
                <div className="flex h-11 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  +91
                </div>
                <Input
                  id="task-auth-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  className="h-11 flex-1"
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full h-11"
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              onClick={async () => {
                setLoading(true);
                try {
                  const digits = phone.replace(/\D/g, "");
                  const toSend = phone.startsWith("+") ? phone : digits.length === 10 ? digits : phone;
                  const normalized = await onSendOtp(toSend);
                  setNormalizedPhone(normalized);
                  setOtpSent(true);
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Failed to send code";
                  toast({ title: "Couldn't send code", description: msg, variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
              Send code
            </Button>

            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground py-2 inline-flex items-center justify-center gap-1"
              onClick={() => setShowEmail(true)}
            >
              <Mail className="h-3.5 w-3.5" />
              More options — continue with email
            </button>
          </div>
        )}

        {otpSent && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-foreground">{normalizedPhone}</span>
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (value.length === 6) {
                    void (async () => {
                      setLoading(true);
                      try {
                        await onVerifyOtp(normalizedPhone, value);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : "Invalid code";
                        toast({ title: "Verification failed", description: msg, variant: "destructive" });
                      } finally {
                        setLoading(false);
                      }
                    })();
                  }
                }}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="button"
              className="w-full h-11"
              disabled={loading || otp.length !== 6}
              onClick={async () => {
                setLoading(true);
                try {
                  await onVerifyOtp(normalizedPhone, otp);
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Invalid code";
                  toast({ title: "Verification failed", description: msg, variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify &amp; continue
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
              }}
            >
              Change phone number
            </button>
          </div>
        )}

        {showEmail && !otpSent && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-auth-email">Email</Label>
              <Input
                id="task-auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-auth-password">Password</Label>
              <Input
                id="task-auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </div>
            <Button
              type="button"
              className="w-full h-11"
              disabled={loading || !email || password.length < 6}
              onClick={async () => {
                setLoading(true);
                try {
                  await onEmailContinue(email, password);
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Couldn't sign in";
                  toast({ title: "Couldn't continue", description: msg, variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowEmail(false)}
            >
              Back to phone
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          By continuing you agree to our Terms &amp; Privacy Policy.
        </p>
      </SheetContent>
    </Sheet>
  );
}
