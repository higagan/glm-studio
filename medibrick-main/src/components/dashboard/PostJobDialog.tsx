import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/product-analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, RotateCcw } from "lucide-react";
import GoogleLocationAutocomplete from "@/components/ui/google-location-autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isHospitalProfileReadyForPosting } from "@/lib/hospital-profile-readiness";
import {
  CLINICAL_DEPARTMENTS,
  HEALTHCARE_ROLE_CATEGORIES,
  SPECIALTIES_BY_ROLE,
  generateShiftTitle,
  isHealthcareRoleCategory,
  type HealthcareRoleCategory,
} from "@/lib/healthcare-roles";
import type { PostedShiftSummary } from "@/components/dashboard/PostShiftSuccessDialog";

export type ShiftDuplicateSeed = {
  title: string;
  roleCategory: string;
  department: string;
  specialty: string;
  description: string;
  shift_start_time: string;
  shift_end_time: string;
  compensation: string;
  preserveTitle?: boolean;
};

interface PostJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (posted: PostedShiftSummary) => void;
  hospitalId: string;
  duplicateFrom?: ShiftDuplicateSeed | null;
  onDuplicateConsumed?: () => void;
}

const EMPTY_FORM = {
  title: "",
  roleCategory: "" as HealthcareRoleCategory | "",
  department: "",
  specialty: "",
  description: "",
  shift_date: "",
  shift_start_time: "",
  shift_end_time: "",
  compensation: "",
};

export default function PostJobDialog({
  open,
  onOpenChange,
  onSuccess,
  hospitalId,
  duplicateFrom,
  onDuplicateConsumed,
}: PostJobDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [location, setLocation] = useState<{
    address: string;
    latitude: number | null;
    longitude: number | null;
    hospital_name: string;
    city: string;
    state?: string;
  }>({ address: "", latitude: null, longitude: null, hospital_name: "", city: "" });

  const [formData, setFormData] = useState(EMPTY_FORM);

  const applyDuplicateSeed = useCallback((seed: ShiftDuplicateSeed) => {
    setFormData({
      title: seed.title,
      roleCategory: isHealthcareRoleCategory(seed.roleCategory)
        ? seed.roleCategory
        : "",
      department: seed.department,
      specialty: seed.specialty,
      description: seed.description,
      shift_date: "",
      shift_start_time: seed.shift_start_time,
      shift_end_time: seed.shift_end_time,
      compensation: seed.compensation,
    });
    setTitleManuallyEdited(seed.preserveTitle ?? true);
  }, []);

  useEffect(() => {
    if (open && hospitalId) fetchHospitalLocation();
  }, [open, hospitalId]);

  useEffect(() => {
    if (!open) return;
    if (duplicateFrom) {
      applyDuplicateSeed(duplicateFrom);
      onDuplicateConsumed?.();
      return;
    }
    setFormData(EMPTY_FORM);
    setTitleManuallyEdited(false);
  }, [open, duplicateFrom, applyDuplicateSeed, onDuplicateConsumed]);

  const fetchHospitalLocation = async () => {
    try {
      const { data, error } = await supabase
        .from("hospital_profiles")
        .select("hospital_name, address, city, state, latitude, longitude")
        .eq("id", hospitalId)
        .single();

      if (error) throw error;

      if (data) {
        const addressParts = [data.address, data.city, data.state]
          .filter(Boolean)
          .join(", ");
        setLocation({
          address: addressParts || "",
          latitude: data.latitude,
          longitude: data.longitude,
          hospital_name: data.hospital_name || "",
          city: data.city || "",
          state: data.state || "",
        });
      }
    } catch (error) {
      console.error("Error fetching hospital location:", error);
    }
  };

  const updateForm = (patch: Partial<typeof formData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch };
      if (
        !titleManuallyEdited &&
        next.roleCategory &&
        next.department &&
        isHealthcareRoleCategory(next.roleCategory)
      ) {
        next.title = generateShiftTitle(next.roleCategory, next.department, next.specialty);
      }
      return next;
    });
  };

  const handleRoleChange = (role: HealthcareRoleCategory) => {
    const specialties = SPECIALTIES_BY_ROLE[role];
    const specialty = specialties[0] ?? "Other";
    updateForm({ roleCategory: role, specialty });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.roleCategory || !formData.department || !formData.specialty) {
      toast({
        title: "Missing details",
        description: "Select role, department, and specialty before posting.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Shift title required",
        description: "Enter a title or select role and department to auto-generate one.",
        variant: "destructive",
      });
      return;
    }

    if (formData.shift_date && new Date(formData.shift_date) < new Date(new Date().toDateString())) {
      toast({
        title: "Invalid shift date",
        description: "Shift date cannot be in the past. Please select a future date.",
        variant: "destructive",
      });
      return;
    }

    if (!isHospitalProfileReadyForPosting(location)) {
      toast({
        title: "Location required",
        description: "Pick your hospital address from the dropdown below.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (hospitalId) {
        await supabase
          .from("hospital_profiles")
          .update({
            address: location.address,
            city: location.city || null,
            state: location.state || null,
            latitude: location.latitude,
            longitude: location.longitude,
            hospital_name: location.hospital_name || undefined,
          })
          .eq("id", hospitalId);
      }

      const { data: inserted, error } = await supabase
        .from("job_posts")
        .insert({
          hospital_id: hospitalId,
          title: formData.title.trim(),
          department: formData.department,
          description: formData.description,
          shift_date: formData.shift_date,
          shift_start_time: formData.shift_start_time,
          shift_end_time: formData.shift_end_time,
          required_specialization: formData.roleCategory,
          specialty: formData.specialty,
          compensation: parseFloat(formData.compensation),
        } as Record<string, unknown>)
        .select(
          "id, slug, title, department, shift_date, shift_start_time, shift_end_time, compensation, required_specialization, specialty"
        )
        .single();

      if (error || !inserted) throw error ?? new Error("Failed to create shift");

      const posted = inserted as {
        id: string;
        slug: string;
        title: string;
        department: string;
        shift_date: string;
        shift_start_time: string;
        shift_end_time: string;
        compensation: number | null;
        required_specialization: string;
        specialty: string | null;
      };

      track("job_published", {
        department: formData.department,
        roleCategory: formData.roleCategory,
        specialty: formData.specialty,
      });

      onSuccess({
        id: posted.id,
        slug: posted.slug,
        title: posted.title,
        department: posted.department,
        roleCategory: posted.required_specialization,
        specialty: posted.specialty,
        shift_date: posted.shift_date,
        shift_start_time: posted.shift_start_time,
        shift_end_time: posted.shift_end_time,
        compensation: posted.compensation ?? parseFloat(formData.compensation),
        locationLabel: location.address,
        hospitalName: location.hospital_name,
        city: location.city,
      });

      setFormData(EMPTY_FORM);
      setTitleManuallyEdited(false);
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to post shift";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const specialtyOptions =
    formData.roleCategory && isHealthcareRoleCategory(formData.roleCategory)
      ? SPECIALTIES_BY_ROLE[formData.roleCategory]
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl max-h-[92vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".pac-container")) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".pac-container")) e.preventDefault();
        }}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl">
            {duplicateFrom ? "Duplicate shift" : "Post a shift"}
          </DialogTitle>
          <DialogDescription>
            {duplicateFrom
              ? "Adjust the date and publish — everything else is pre-filled."
              : "Who do you need, where, and when? We'll help professionals find this shift."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pb-2">
          {/* Role — primary decision */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role needed *</Label>
            <Select
              value={formData.roleCategory}
              onValueChange={(value) => handleRoleChange(value as HealthcareRoleCategory)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select role (Doctor, Nurse, …)" />
              </SelectTrigger>
              <SelectContent>
                {HEALTHCARE_ROLE_CATEGORIES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Department / unit *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => updateForm({ department: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Where is the gap?" />
                </SelectTrigger>
                <SelectContent>
                  {CLINICAL_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Specialty *</Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) => updateForm({ specialty: value })}
                disabled={!formData.roleCategory}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={formData.roleCategory ? "Select specialty" : "Pick role first"} />
                </SelectTrigger>
                <SelectContent>
                  {specialtyOptions.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-generated title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Shift title *
              </Label>
              {titleManuallyEdited && formData.roleCategory && formData.department && (
                <button
                  type="button"
                  className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"
                  onClick={() => {
                    setTitleManuallyEdited(false);
                    if (isHealthcareRoleCategory(formData.roleCategory)) {
                      updateForm({
                        title: generateShiftTitle(
                          formData.roleCategory,
                          formData.department,
                          formData.specialty
                        ),
                      });
                    }
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Auto-generate
                </button>
              )}
            </div>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                setTitleManuallyEdited(true);
                setFormData((prev) => ({ ...prev, title: e.target.value }));
              }}
              placeholder="Auto-generated when you pick role and department"
              required
              className="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shift_date" className="text-sm font-medium">
                Shift date *
              </Label>
              <Input
                id="shift_date"
                type="date"
                value={formData.shift_date}
                onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift_start_time" className="text-sm font-medium">
                Start *
              </Label>
              <Input
                id="shift_start_time"
                type="time"
                value={formData.shift_start_time}
                onChange={(e) => setFormData({ ...formData, shift_start_time: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift_end_time" className="text-sm font-medium">
                End *
              </Label>
              <Input
                id="shift_end_time"
                type="time"
                value={formData.shift_end_time}
                onChange={(e) => setFormData({ ...formData, shift_end_time: e.target.value })}
                required
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="compensation" className="text-sm font-medium">
              Pay rate (₹/hour) *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                ₹
              </span>
              <Input
                id="compensation"
                type="number"
                step="1"
                min="1"
                value={formData.compensation}
                onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
                placeholder="e.g. 800"
                required
                className="h-11 pl-8 text-base font-semibold"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clear hourly rates help professionals decide quickly.
            </p>
          </div>

          {isHospitalProfileReadyForPosting(location) ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Shift location</p>
                <p className="text-sm font-medium text-foreground truncate">{location.address}</p>
              </div>
              <Badge variant="info" className="flex-shrink-0 hidden sm:inline-flex">
                Verified
              </Badge>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/10 p-4">
              <p className="text-sm font-medium text-foreground">Where is this shift?</p>
              <p className="text-xs text-muted-foreground">
                Pick your hospital from the dropdown so professionals can find it.
              </p>
              <GoogleLocationAutocomplete
                value={{
                  address: location.address,
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                onChange={(loc) =>
                  setLocation((prev) => ({
                    ...prev,
                    address: loc.address,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    city: loc.city || prev.city,
                    state: loc.state || prev.state,
                  }))
                }
                label="Hospital address"
                required
                placeholder="Search hospital name or address…"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Shift notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Certifications, reporting instructions, dress code…"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="pt-2 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {duplicateFrom ? "Publish shift" : "Post shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
