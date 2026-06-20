export interface HospitalProfileSummary {
  id?: string;
  hospital_name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  slug?: string | null;
}

export interface PublicJobPost {
  id: string;
  slug: string;
  title: string;
  department: string;
  description: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  required_specialization: string;
  specialty?: string | null;
  compensation: number | null;
  status: string;
  created_at: string | null;
  hospital_profiles: HospitalProfileSummary;
}

/** Exclude demo/seed listings from the public marketplace. */
export const PUBLIC_MARKETPLACE_ONLY = { is_seed_data: false } as const;

export const PUBLIC_JOB_SELECT = `
  id,
  slug,
  title,
  department,
  description,
  shift_date,
  shift_start_time,
  shift_end_time,
  required_specialization,
  specialty,
  compensation,
  status,
  created_at,
  hospital_profiles (
    id,
    hospital_name,
    city,
    address,
    latitude,
    longitude,
    slug
  )
`;
