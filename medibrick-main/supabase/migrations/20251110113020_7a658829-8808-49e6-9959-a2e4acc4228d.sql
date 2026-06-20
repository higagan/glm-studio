-- Add geospatial columns to hospital_profiles for proximity search
ALTER TABLE public.hospital_profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comment for clarity
COMMENT ON COLUMN public.hospital_profiles.latitude IS 'GPS latitude coordinate for proximity-based job search';
COMMENT ON COLUMN public.hospital_profiles.longitude IS 'GPS longitude coordinate for proximity-based job search';

-- Create an index for geospatial queries (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_hospital_profiles_coordinates 
ON public.hospital_profiles (latitude, longitude);