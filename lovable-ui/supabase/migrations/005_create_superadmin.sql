-- This script updates an existing user to be superadmin
-- Note: This migration only updates the user profile, not create the auth user
-- To create the superadmin user, run: npx tsx scripts/create-superadmin.ts
--
-- Default superadmin email: superadmin@dtc.com
-- Default password: Access123!

-- Update existing user to be superadmin and approved
-- This will run when the migration is applied and update the user if they exist
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for the superadmin email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'superadmin@dtc.com';

  -- If user exists, make them superadmin
  IF admin_user_id IS NOT NULL THEN
    UPDATE user_profiles
    SET
      is_superadmin = true,
      is_approved = true,
      approved_by = admin_user_id,
      approved_at = NOW(),
      full_name = 'Super Admin'
    WHERE id = admin_user_id;

    RAISE NOTICE 'Superadmin user updated successfully: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Superadmin user not found. Run "npx tsx scripts/create-superadmin.ts" to create it.';
  END IF;
END $$;
