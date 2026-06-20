import { useState, useEffect, useRef } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const libraries: ("places")[] = ["places"];

interface GoogleLocationAutocompleteProps {
  value?: {
    address: string;
    latitude: number | null;
    longitude: number | null;
  };
  onChange: (location: {
    address: string;
    latitude: number | null;
    longitude: number | null;
    city?: string;
    state?: string;
  }) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export default function GoogleLocationAutocomplete({
  value,
  onChange,
  label = "Hospital Location",
  required = false,
  placeholder = "Enter hospital address...",
}: GoogleLocationAutocompleteProps) {
  const [address, setAddress] = useState(value?.address || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      // Initialize Google Places Autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: "in" },
          fields: ["formatted_address", "geometry", "name", "address_components"],
          types: ["establishment", "geocode"],
        }
      );

      // Listen for place selection
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();

        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const selectedAddress = place.formatted_address || place.name || "";

          // Extract city and state from address_components
          let city = "";
          let state = "";
          if (place.address_components) {
            for (const component of place.address_components) {
              const types = component.types;
              if (types.includes("locality")) {
                city = component.long_name;
              } else if (types.includes("administrative_area_level_1")) {
                state = component.long_name;
              }
            }
          }

          setAddress(selectedAddress);
          onChange({
            address: selectedAddress,
            latitude: lat,
            longitude: lng,
            city,
            state,
          });
        }
      });
    }
  }, [isLoaded, onChange]);

  // Sync external value changes
  useEffect(() => {
    if (value?.address !== address) {
      setAddress(value?.address || "");
    }
  }, [value?.address]);

  // Fallback to manual input if Google Maps fails or hasn't loaded
  if (loadError) {
    return (
      <div className="space-y-2">
        <Label htmlFor="location">{label} {required && "*"}</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            id="location"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              onChange({
                address: e.target.value,
                latitude: null,
                longitude: null,
              });
            }}
            placeholder={placeholder}
            required={required}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter address manually (Google Maps autocomplete unavailable)
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-2">
        <Label>{label} {required && "*"}</Label>
        <div className="relative">
          <Input disabled placeholder="Loading Google Maps..." />
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="location">{label} {required && "*"}</Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          id="location"
          value={address}
          onChange={(e) => {
              const next = e.target.value;
              setAddress(next);
              onChange({
                address: next,
                latitude: null,
                longitude: null,
              });
            }}
          placeholder={placeholder}
          required={required}
          className="pl-10"
        />
      </div>

      {/* Show coordinates if location is selected */}
      {value?.latitude && value?.longitude && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          GPS coordinates captured: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}
