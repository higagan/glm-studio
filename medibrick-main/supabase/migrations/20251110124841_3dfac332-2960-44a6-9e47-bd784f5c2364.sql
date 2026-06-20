-- Fix phone OTP authentication by making email optional in profiles table
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- Update the trigger function to handle phone-only authentication
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with email if available, otherwise use phone or empty string
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, '')
  );
  
  -- Insert role if specified in metadata
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::user_role);
  END IF;
  
  RETURN NEW;
END;
$$;