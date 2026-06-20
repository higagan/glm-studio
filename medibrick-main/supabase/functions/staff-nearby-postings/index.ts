import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius_km = 50 } = await req.json();
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required as numbers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finding postings near (${lat}, ${lng}) within ${radius_km}km`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch open job posts with hospital info
    const { data: jobs, error: jobsError } = await supabase
      .from('job_posts')
      .select(`
        id,
        slug,
        title,
        department,
        description,
        shift_date,
        shift_start_time,
        shift_end_time,
        compensation,
        required_specialization,
        status,
        hospital_profiles (
          id,
          hospital_name,
          slug,
          address,
          city,
          state,
          latitude,
          longitude
        )
      `)
      .eq('status', 'open')
      .eq('is_seed_data', false)
      .gte('shift_date', new Date().toISOString().split('T')[0]);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job postings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${jobs?.length || 0} open jobs`);

    // Calculate distances and filter by radius
    const nearbyPostings = (jobs || [])
      .filter(job => {
        const hospital = job.hospital_profiles as any;
        return hospital?.latitude && hospital?.longitude;
      })
      .map(job => {
        const hospital = job.hospital_profiles as any;
        const distance = calculateDistance(
          lat, lng,
          parseFloat(hospital.latitude),
          parseFloat(hospital.longitude)
        );
        return {
          ...job,
          hospital: hospital,
          distance_km: Math.round(distance * 10) / 10
        };
      })
      .filter(job => job.distance_km <= radius_km)
      .sort((a, b) => a.distance_km - b.distance_km);

    console.log(`${nearbyPostings.length} postings within ${radius_km}km`);

    return new Response(
      JSON.stringify({ postings: nearbyPostings }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Staff nearby postings error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch nearby postings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
