-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('hospital', 'professional');

-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('open', 'filled', 'closed');

-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (secure role management)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create hospital_profiles table
CREATE TABLE public.hospital_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  hospital_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professional_profiles table
CREATE TABLE public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  specialization TEXT NOT NULL,
  experience_years INTEGER,
  qualifications TEXT,
  bio TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_posts table
CREATE TABLE public.job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospital_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL,
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  required_specialization TEXT NOT NULL,
  compensation DECIMAL(10,2),
  status job_status DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  status application_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, professional_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles on signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for hospital_profiles
CREATE POLICY "Anyone can view hospital profiles"
  ON public.hospital_profiles FOR SELECT
  USING (true);

CREATE POLICY "Hospitals can manage their own profile"
  ON public.hospital_profiles FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for professional_profiles
CREATE POLICY "Anyone can view professional profiles"
  ON public.professional_profiles FOR SELECT
  USING (true);

CREATE POLICY "Professionals can manage their own profile"
  ON public.professional_profiles FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for job_posts
CREATE POLICY "Anyone can view open jobs"
  ON public.job_posts FOR SELECT
  USING (true);

CREATE POLICY "Hospitals can create jobs"
  ON public.job_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hospital_profiles
      WHERE user_id = auth.uid() AND id = hospital_id
    )
  );

CREATE POLICY "Hospitals can update their own jobs"
  ON public.job_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.hospital_profiles
      WHERE user_id = auth.uid() AND id = hospital_id
    )
  );

CREATE POLICY "Hospitals can delete their own jobs"
  ON public.job_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.hospital_profiles
      WHERE user_id = auth.uid() AND id = hospital_id
    )
  );

-- RLS Policies for applications
CREATE POLICY "Professionals can view their own applications"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE user_id = auth.uid() AND id = professional_id
    )
  );

CREATE POLICY "Hospitals can view applications to their jobs"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_posts jp
      JOIN public.hospital_profiles hp ON jp.hospital_id = hp.id
      WHERE jp.id = job_id AND hp.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can create applications"
  ON public.applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE user_id = auth.uid() AND id = professional_id
    )
  );

CREATE POLICY "Hospitals can update application status"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_posts jp
      JOIN public.hospital_profiles hp ON jp.hospital_id = hp.id
      WHERE jp.id = job_id AND hp.user_id = auth.uid()
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hospital_profiles_updated_at BEFORE UPDATE ON public.hospital_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_profiles_updated_at BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();