-- Create user_profiles table to track approval status and roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_superadmin BOOLEAN DEFAULT false,
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Superadmins can view all profiles
CREATE POLICY "Superadmins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_superadmin = true
    )
  );

-- Superadmins can update all profiles
CREATE POLICY "Superadmins can update all profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_superadmin = true
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_approved ON user_profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_user_profiles_superadmin ON user_profiles(is_superadmin);

-- Update the trigger function to create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create user profile (not approved by default)
  INSERT INTO public.user_profiles (id, full_name, is_approved, is_superadmin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false,
    false
  );

  -- Create a default organization for the new user
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization')
  RETURNING id INTO new_org_id;

  -- Add the user as the owner of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get all users for admin (superadmin only)
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  is_approved BOOLEAN,
  is_superadmin BOOLEAN,
  approval_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if the caller is a superadmin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND is_superadmin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Superadmin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    u.email,
    up.full_name,
    up.is_approved,
    up.is_superadmin,
    up.approval_notes,
    up.approved_by,
    up.approved_at,
    up.created_at
  FROM user_profiles up
  LEFT JOIN auth.users u ON up.id = u.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve a user (superadmin only)
CREATE OR REPLACE FUNCTION public.approve_user(
  target_user_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the caller is a superadmin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_superadmin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Superadmin privileges required';
  END IF;

  -- Update the user profile
  UPDATE user_profiles
  SET
    is_approved = true,
    approval_notes = notes,
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = target_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject/unapprove a user (superadmin only)
CREATE OR REPLACE FUNCTION public.reject_user(
  target_user_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the caller is a superadmin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_superadmin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Superadmin privileges required';
  END IF;

  -- Update the user profile
  UPDATE user_profiles
  SET
    is_approved = false,
    approval_notes = notes,
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = target_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
