import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Filter, Calendar, Clock, MapPin, DollarSign, Briefcase } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import {
  CLINICAL_DEPARTMENTS,
  HEALTHCARE_ROLE_CATEGORIES,
  ALL_SPECIALTIES,
} from "@/lib/healthcare-roles";

const DEPARTMENTS = CLINICAL_DEPARTMENTS;
const ROLE_CATEGORIES = HEALTHCARE_ROLE_CATEGORIES;
const SPECIALTY_OPTIONS = ALL_SPECIALTIES;

export interface JobFilters {
  dateRange: "all" | "today" | "week" | "month";
  shiftTime: "all" | "morning" | "day" | "evening" | "night";
  departments: string[];
  /** Primary role categories (Doctor, Nurse, …) */
  specializations: string[];
  /** Secondary specialties (ICU Nurse, General Physician, …) */
  specialties: string[];
  minCompensation: string;
  maxCompensation: string;
  maxDistance: string; // in km
}

interface JobFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  onReset: () => void;
  userLocation: { latitude: number; longitude: number } | null;
  activeFilterCount: number;
}

export default function JobFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
  userLocation,
  activeFilterCount,
}: JobFiltersProps) {
  const [localFilters, setLocalFilters] = useState<JobFilters>(filters);

  const updateFilter = (key: keyof JobFilters, value: any) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const toggleDepartment = (dept: string) => {
    const updated = localFilters.departments.includes(dept)
      ? localFilters.departments.filter(d => d !== dept)
      : [...localFilters.departments, dept];
    updateFilter("departments", updated);
  };

  const toggleRoleCategory = (role: string) => {
    const updated = localFilters.specializations.includes(role)
      ? localFilters.specializations.filter((r) => r !== role)
      : [...localFilters.specializations, role];
    updateFilter("specializations", updated);
  };

  const toggleSpecialty = (spec: string) => {
    const updated = localFilters.specialties.includes(spec)
      ? localFilters.specialties.filter((s) => s !== spec)
      : [...localFilters.specialties, spec];
    updateFilter("specialties", updated);
  };

  const handleReset = () => {
    const resetFilters: JobFilters = {
      dateRange: "all",
      shiftTime: "all",
      departments: [],
      specializations: [],
      specialties: [],
      minCompensation: "",
      maxCompensation: "",
      maxDistance: "",
    };
    setLocalFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-6 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Filter Jobs</h3>
          {hasActiveFilters && (
            <Badge variant="info" className="ml-2">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-10 px-3">
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <Separator />

      {/* Date Range Filter */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Date Range
        </Label>
        <Select value={localFilters.dateRange} onValueChange={(value: any) => updateFilter("dateRange", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Next 7 Days</SelectItem>
            <SelectItem value="month">Next 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shift Time Filter */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Shift Time
        </Label>
        <Select value={localFilters.shiftTime} onValueChange={(value: any) => updateFilter("shiftTime", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
            <SelectItem value="day">Day (12 PM - 6 PM)</SelectItem>
            <SelectItem value="evening">Evening (6 PM - 12 AM)</SelectItem>
            <SelectItem value="night">Night (12 AM - 6 AM)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Department Filter */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Department
        </Label>
        <div className="max-h-56 overflow-y-auto border rounded-xl p-3 space-y-1">
          {DEPARTMENTS.map((dept) => (
            <label
              key={dept}
              htmlFor={`dept-${dept}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer"
            >
              <Checkbox
                id={`dept-${dept}`}
                checked={localFilters.departments.includes(dept)}
                onCheckedChange={() => toggleDepartment(dept)}
              />
              <span className="text-sm font-normal flex-1">
                {dept}
              </span>
            </label>
          ))}
        </div>
        {localFilters.departments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {localFilters.departments.map((dept) => (
              <Badge key={dept} variant="neutral" className="flex items-center gap-1">
                {dept}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleDepartment(dept)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Role filter */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Role
        </Label>
        <div className="max-h-48 overflow-y-auto border rounded-xl p-3 space-y-1">
          {ROLE_CATEGORIES.map((role) => (
            <label
              key={role}
              htmlFor={`role-${role}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer"
            >
              <Checkbox
                id={`role-${role}`}
                checked={localFilters.specializations.includes(role)}
                onCheckedChange={() => toggleRoleCategory(role)}
              />
              <span className="text-sm font-normal flex-1">{role}</span>
            </label>
          ))}
        </div>
        {localFilters.specializations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {localFilters.specializations.map((role) => (
              <Badge key={role} variant="neutral" className="flex items-center gap-1">
                {role}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleRoleCategory(role)} />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Specialty filter */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Specialty
        </Label>
        <div className="max-h-48 overflow-y-auto border rounded-xl p-3 space-y-1">
          {SPECIALTY_OPTIONS.map((spec) => (
            <label
              key={spec}
              htmlFor={`spec-${spec}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer"
            >
              <Checkbox
                id={`spec-${spec}`}
                checked={localFilters.specialties.includes(spec)}
                onCheckedChange={() => toggleSpecialty(spec)}
              />
              <span className="text-sm font-normal flex-1">{spec}</span>
            </label>
          ))}
        </div>
        {localFilters.specialties.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {localFilters.specialties.map((spec) => (
              <Badge key={spec} variant="neutral" className="flex items-center gap-1">
                {spec}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSpecialty(spec)} />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Compensation Range */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Compensation Range (₹)
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="min-comp" className="text-xs text-muted-foreground">
              Min
            </Label>
            <Input
              id="min-comp"
              type="number"
              placeholder="0"
              value={localFilters.minCompensation}
              onChange={(e) => updateFilter("minCompensation", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="max-comp" className="text-xs text-muted-foreground">
              Max
            </Label>
            <Input
              id="max-comp"
              type="number"
              placeholder="No limit"
              value={localFilters.maxCompensation}
              onChange={(e) => updateFilter("maxCompensation", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Distance Filter */}
      {userLocation && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Maximum Distance
          </Label>
          <Select value={localFilters.maxDistance || "any"} onValueChange={(value) => updateFilter("maxDistance", value === "any" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Any distance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Distance</SelectItem>
              <SelectItem value="5">Within 5 km</SelectItem>
              <SelectItem value="10">Within 10 km</SelectItem>
              <SelectItem value="25">Within 25 km</SelectItem>
              <SelectItem value="50">Within 50 km</SelectItem>
              <SelectItem value="100">Within 100 km</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!userLocation && (
        <div className="text-xs text-muted-foreground p-3 bg-muted rounded-xl">
          Enable location access to filter by distance
        </div>
      )}
    </div>
  );
}
