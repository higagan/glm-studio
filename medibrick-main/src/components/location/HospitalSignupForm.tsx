import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { track } from "@/lib/product-analytics";

interface HospitalSignupFormProps {
  onSuccess?: () => void;
}

export function HospitalSignupForm({ onSuccess }: HospitalSignupFormProps) {
  const [hospitalName, setHospitalName] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  const handleAddressBlur = async () => {
    if (!address.trim()) return;
    
    setIsGeocoding(true);
    setGeocodeError("");
    setCoordinates(null);

    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (error) throw error;

      if (data.error) {
        setGeocodeError(data.error);
        return;
      }

      setCoordinates({ lat: data.lat, lng: data.lng });
      toast.success("Location found!");
    } catch (err) {
      console.error("Geocoding error:", err);
      setGeocodeError('Could not find location, try "Apollo Hospital Bannerghatta, Bangalore"');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    track("hospital_signup_started", {
      hasName: !!hospitalName.trim(),
      hasAddress: !!address.trim(),
    });

    if (!hospitalName.trim() || !address.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!coordinates) {
      toast.error("Please enter a valid address to get location");
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to register a hospital");
        return;
      }

      const { error } = await supabase.from('hospital_profiles').insert({
        user_id: user.id,
        hospital_name: hospitalName.trim(),
        address: address.trim(),
        latitude: coordinates.lat,
        longitude: coordinates.lng
      });

      if (error) throw error;

      track("hospital_signup_completed", {
        hasCoordinates: !!coordinates,
      });

      toast.success("Hospital registered successfully!");
      setHospitalName("");
      setAddress("");
      setCoordinates(null);
      onSuccess?.();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save hospital");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Register Hospital
        </CardTitle>
        <CardDescription>
          Add your hospital to MediBricks network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="hospitalName" className="text-base font-semibold">Hospital Name</Label>
            <Input
              id="hospitalName"
              placeholder="e.g., Apollo Hospital"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="address" className="text-base font-semibold">Address</Label>
            <div className="relative">
              <Input
                id="address"
                placeholder="e.g., Bannerghatta Road, Bangalore"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setCoordinates(null);
                  setGeocodeError("");
                }}
                onBlur={handleAddressBlur}
                required
              />
              {isGeocoding && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {coordinates && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {geocodeError && (
              <p className="text-sm text-destructive">{geocodeError}</p>
            )}
            {coordinates && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSaving || !coordinates}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Hospital"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
