-- This script creates the superadmin user
-- Note: This assumes the user has already signed up via the normal signup flow
-- If the user doesn't exist, you need to create them via Supabase Auth first

-- Update existing user to be superadmin and approved
-- Replace 'superadmin@example.com' with the actual email if different
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for the superadmin email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'superadmin@example.com';

  -- If user exists, make them superadmin
  IF admin_user_id IS NOT NULL THEN
    UPDATE user_profiles
    SET
      is_superadmin = true,
      is_approved = true,
      approved_by = admin_user_id,
      approved_at = NOW()
    WHERE id = admin_user_id;

    RAISE NOTICE 'Superadmin user updated successfully: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User with email superadmin@example.com not found. Please sign up first.';
  END IF;
END $$;
