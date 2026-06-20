import { useState } from "react";
import { track } from "@/lib/product-analytics";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Linkedin,
  Mail,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PublicJobPost } from "@/lib/job-types";

type ShareableJob = Pick<
  PublicJobPost,
  "id" | "slug" | "title" | "shift_date" | "compensation" | "hospital_profiles"
>;

interface ShareJobButtonProps {
  job: ShareableJob;
  className?: string;
  /** Size passed to the trigger Button. Default "sm" for desktop header; use "default" in mobile bottom bar for a 40px touch target. */
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

interface ShareChannel {
  id: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  action: () => void;
}

export default function ShareJobButton({ job, className, buttonSize = "sm" }: ShareJobButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jobUrl = `${window.location.origin}/jobs/${job.slug}`;
  const hospitalName = job.hospital_profiles?.hospital_name || "Hospital";
  const city = job.hospital_profiles?.city || "India";
  const shareText = `${job.title} at ${hospitalName}, ${city} — apply on MediBricks`;

  function taggedUrl(via: string) {
    return `${jobUrl}?via=${via}`;
  }

  function trackAndRun(channel: string, fn: () => void) {
    track("job_shared", { channel, jobSlug: job.slug || job.id, jobTitle: job.title });
    fn();
  }

  async function handleNative() {
    if (navigator.share) {
      trackAndRun("native", async () => {
        try {
          await navigator.share({
            title: `${job.title} — MediBricks`,
            text: shareText,
            url: taggedUrl("native"),
          });
        } catch {
          // user cancelled — no-op
        }
      });
    } else {
      setOpen(true);
    }
  }

  function handleWhatsApp() {
    trackAndRun("whatsapp", () => {
      const text = encodeURIComponent(`${shareText}\n${taggedUrl("whatsapp")}`);
      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    });
  }

  function handleLinkedIn() {
    trackAndRun("linkedin", () => {
      const url = encodeURIComponent(taggedUrl("linkedin"));
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        "_blank",
        "noopener,noreferrer"
      );
    });
  }

  function handleCopyLink() {
    trackAndRun("copy_link", () => {
      navigator.clipboard.writeText(taggedUrl("copy")).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    });
  }

  function handleEmail() {
    trackAndRun("email", () => {
      const subject = encodeURIComponent(`Healthcare shift: ${job.title} at ${hospitalName}`);
      const body = encodeURIComponent(
        `Hi,\n\nI thought you might be interested in this healthcare shift on MediBricks:\n\n${job.title}\n${hospitalName} · ${city}\n\n${taggedUrl("email")}\n\n— Sent via MediBricks`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    });
  }

  const channels: ShareChannel[] = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      colorClass: "hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30",
      action: handleWhatsApp,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      colorClass: "hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30",
      action: handleLinkedIn,
    },
    {
      id: "copy",
      label: copied ? "Copied!" : "Copy Link",
      icon: copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />,
      colorClass: copied
        ? "bg-primary/10 text-primary border-primary/30"
        : "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
      action: handleCopyLink,
    },
    {
      id: "email",
      label: "Email",
      icon: <Mail className="h-4 w-4" />,
      colorClass: "hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/30",
      action: handleEmail,
    },
  ];

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleNative}
        className="gap-2"
        aria-label="Share this job"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      {/* Fallback sheet for non-native share (desktop) */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-card shadow-lg p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Share this shift
                </p>
                <p className="text-sm text-foreground font-medium leading-snug">
                  Know someone perfect for this shift?{" "}
                  <span className="text-muted-foreground">Share this opportunity.</span>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    ch.action();
                    if (ch.id !== "copy") setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all",
                    ch.colorClass
                  )}
                >
                  {ch.icon}
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
