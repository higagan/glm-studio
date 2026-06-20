import { format } from "date-fns";
import { CheckCircle2, MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareJobOnWhatsApp } from "@/lib/share-job";

export type PostedShiftSummary = {
  id: string;
  slug: string;
  title: string;
  department: string;
  roleCategory: string;
  specialty?: string | null;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  compensation: number;
  locationLabel: string;
  hospitalName?: string;
  city?: string;
};

type PostShiftSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: PostedShiftSummary | null;
  onBackToDashboard: () => void;
};

export default function PostShiftSuccessDialog({
  open,
  onOpenChange,
  shift,
  onBackToDashboard,
}: PostShiftSuccessDialogProps) {
  if (!shift) return null;

  const viewUrl = `/jobs/${shift.slug}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-center sm:text-left space-y-3">
          <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15">
            <CheckCircle2 className="h-7 w-7 text-secondary" />
          </div>
          <DialogTitle className="text-xl">Shift posted successfully</DialogTitle>
          <DialogDescription>
            Your shift is live. Professionals can discover and apply now.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shift</p>
            <p className="font-semibold text-foreground mt-0.5">{shift.title}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {shift.roleCategory}
              {shift.specialty ? ` · ${shift.specialty}` : ""} · {shift.department}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(shift.shift_date), "EEE, d MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-medium">
                {shift.shift_start_time.slice(0, 5)} – {shift.shift_end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pay rate</p>
              <p className="font-semibold">₹{shift.compensation.toLocaleString("en-IN")}/hr</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium flex items-start gap-1">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{shift.locationLabel}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className="w-full font-semibold h-11">
            <a href={viewUrl} target="_blank" rel="noopener noreferrer">
              View shift
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-green-500/30 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-400"
            onClick={() =>
              shareJobOnWhatsApp({
                slug: shift.slug,
                title: shift.title,
                hospitalName: shift.hospitalName,
                city: shift.city,
              })
            }
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Share on WhatsApp
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onBackToDashboard}>
            Back to dashboard
          </Button>
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">What happens next?</p>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Healthcare professionals can now discover your shift.</li>
            <li>Applicants will appear in your dashboard under each shift.</li>
            <li>You&apos;ll be notified when someone applies.</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
