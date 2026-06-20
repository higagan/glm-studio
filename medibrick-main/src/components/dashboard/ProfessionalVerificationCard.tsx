import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ShieldAlert, Clock, Upload, FileCheck2 } from "lucide-react";
import {
  VERIFICATION_META,
  type VerificationStatus,
  uploadVerificationDocument,
  submitVerification,
} from "@/lib/verification";

interface Props {
  userId: string;
  status: VerificationStatus;
  licenseNumber?: string | null;
  notes?: string | null;
  onSubmitted?: () => void;
}

const TONE_BADGE: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  muted: "secondary",
  warning: "warning",
  success: "success",
  destructive: "destructive",
};

export default function ProfessionalVerificationCard({
  userId,
  status,
  licenseNumber,
  notes,
  onSubmitted,
}: Props) {
  const { toast } = useToast();
  const meta = VERIFICATION_META[status];
  const fileRef = useRef<HTMLInputElement>(null);
  const [license, setLicense] = useState(licenseNumber || "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = status === "unverified" || status === "rejected";
  const Icon =
    status === "verified" ? ShieldCheck : status === "pending" ? Clock : ShieldAlert;

  const handleSubmit = async () => {
    if (!license.trim()) {
      toast({ title: "License number required", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Please attach a credential document", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const path = await uploadVerificationDocument(userId, file);
      await submitVerification(userId, license.trim(), path);
      toast({ title: "Submitted for review", description: meta.description });
      onSubmitted?.();
    } catch (e) {
      toast({
        title: "Couldn't submit",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={status === "verified" ? "border-success/30 bg-success/5" : undefined}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Icon
            className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              status === "verified"
                ? "text-success"
                : status === "pending"
                ? "text-warning"
                : "text-muted-foreground"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">Credential verification</h3>
              <Badge variant={TONE_BADGE[meta.tone]}>{meta.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
            {status === "rejected" && notes && (
              <p className="text-sm text-destructive mt-2">Reviewer note: {notes}</p>
            )}
          </div>
        </div>

        {canSubmit && (
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <Label htmlFor="ver-license" className="text-sm font-medium">
                Registration / License number
              </Label>
              <Input
                id="ver-license"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="e.g. State Medical Council reg. no."
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Credential document</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-start gap-2 font-normal"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <>
                    <FileCheck2 className="h-4 w-4 text-success" />
                    <span className="truncate">{file.name}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    Upload license / degree (PDF or image)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Stored privately. Only our verification team can see it.
              </p>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === "rejected" ? "Resubmit for review" : "Submit for verification"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
