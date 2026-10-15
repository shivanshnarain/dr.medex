-- ==============================================================================
-- DR.MEDEX GLOBAL — IDEMPOTENT CUSTOMER PROFILES MIGRATION & ROW LEVEL SECURITY
-- Associates customer profiles with Supabase auth.users.id
-- ==============================================================================

-- 1. Create customer_profiles table if it does not already exist
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles (email);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Idempotently drop existing policies before creating updated ones
DROP POLICY IF EXISTS "Customers can view their own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can update their own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can insert their own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Service role has full access to customer profiles" ON public.customer_profiles;

-- 4. Strict Row Level Security Policies:
-- Authenticated customers can read ONLY their own profile record (matching their auth UID)
CREATE POLICY "Customers can view their own profile"
  ON public.customer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated customers can insert ONLY their own profile record (matching their auth UID)
CREATE POLICY "Customers can insert their own profile"
  ON public.customer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Authenticated customers can update ONLY their own profile record (cannot touch other users' data)
CREATE POLICY "Customers can update their own profile"
  ON public.customer_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Automatic Profile Synchronization Trigger on auth.users Creation
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, full_name, email, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.customer_profiles.phone END,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger to auth.users (idempotent replacement)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer();
