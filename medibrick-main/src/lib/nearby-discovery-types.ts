export type NearbyDiscoveryStats = {
  openShifts: number;
  hiringHospitals: number;
  activeProfessionals: number;
};

export type NearbyDiscoveryTrust = {
  verifiedHospitals: number;
  professionalsPlaced: number;
  avgRating: number | null;
};

export type HospitalHiringRow = {
  id: string;
  hospital_name: string;
  slug: string | null;
  city: string;
  open_shifts: number;
};

export type PopularShiftRow = {
  id: string;
  slug: string | null;
  title: string;
  compensation: number | null;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  hospital_name: string;
  hospital_slug: string | null;
  city: string;
};

export type NearbyDiscoveryPayload = {
  stats: NearbyDiscoveryStats;
  trust: NearbyDiscoveryTrust;
  hospitalsHiring: HospitalHiringRow[];
  popularShifts: PopularShiftRow[];
};

export type NearbyPosting = {
  id: string;
  slug: string | null;
  title: string;
  department: string;
  description: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  compensation: number | null;
  required_specialization: string;
  hospital: {
    id: string;
    hospital_name: string;
    slug: string | null;
    address: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
  distance_km: number;
};
