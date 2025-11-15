import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

const SUPERADMIN_EMAIL = "superadmin@dtc.com";
const SUPERADMIN_PASSWORD = "Access123!";

async function createSuperAdmin() {
  console.log("Creating Super Admin user...\n");

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL is not set");
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is not set");
    console.error("\nPlease add your Supabase service role key to the .env file:");
    console.error("SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here");
    console.error("\nYou can find this in your Supabase project settings:");
    console.error("https://app.supabase.com/project/_/settings/api");
    process.exit(1);
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Step 1: Check if user already exists
    console.log("1. Checking if superadmin user exists...");
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const existingUser = existingUsers?.users.find(u => u.email === SUPERADMIN_EMAIL);

    let userId: string;

    if (existingUser) {
      console.log(`✓ User already exists with email: ${SUPERADMIN_EMAIL}`);
      userId = existingUser.id;

      // Update password in case it changed
      console.log("\n2. Updating password...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: SUPERADMIN_PASSWORD }
      );

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }
      console.log("✓ Password updated");
    } else {
      // Step 2: Create the user
      console.log("2. Creating new superadmin user...");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: "Super Admin",
        },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!newUser.user) {
        throw new Error("User creation returned no user data");
      }

      userId = newUser.user.id;
      console.log(`✓ User created with ID: ${userId}`);
    }

    // Step 3: Update user profile to be superadmin
    console.log("\n3. Setting superadmin privileges...");
    const { error: updateProfileError } = await supabase
      .from("user_profiles")
      .update({
        is_superadmin: true,
        is_approved: true,
        approved_by: userId, // Self-approved
        approved_at: new Date().toISOString(),
        full_name: "Super Admin",
      })
      .eq("id", userId);

    if (updateProfileError) {
      throw new Error(`Failed to update user profile: ${updateProfileError.message}`);
    }

    console.log("✓ Superadmin privileges set");

    // Step 4: Verify the setup
    console.log("\n4. Verifying setup...");
    const { data: profile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch profile: ${fetchError.message}`);
    }

    console.log("\n✅ SUCCESS! Super Admin user created and configured.");
    console.log("\n📋 Login Credentials:");
    console.log("========================");
    console.log(`Email:    ${SUPERADMIN_EMAIL}`);
    console.log(`Password: ${SUPERADMIN_PASSWORD}`);
    console.log("\n📊 User Details:");
    console.log(`User ID:      ${userId}`);
    console.log(`Is Approved:  ${profile.is_approved}`);
    console.log(`Is Superadmin: ${profile.is_superadmin}`);
    console.log(`Created At:   ${profile.created_at}`);

    console.log("\n🎯 Next Steps:");
    console.log("1. Go to your application's login page");
    console.log("2. Login with the credentials above");
    console.log("3. You should have full superadmin access");

  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

createSuperAdmin().catch(console.error);
