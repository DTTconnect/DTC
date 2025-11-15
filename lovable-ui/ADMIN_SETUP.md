# Admin Section Setup Instructions

This document explains how to set up the admin section and create the superadmin user for the multi-tenant application.

## Overview

The application now includes:
- **User approval system**: New users must be approved by a superadmin before accessing the dashboard
- **Admin panel** at `/admin`: Superadmins can view, approve, and revoke user access
- **Superadmin role**: Special admin users with full access to the admin panel

## Database Migrations

The following migrations have been created:

1. `004_user_approval_system.sql` - Creates the user approval system
2. `005_create_superadmin.sql` - Template for creating the superadmin user

## Setup Steps

### 1. Apply Database Migrations

First, apply the new migrations to your Supabase database:

```bash
# If using Supabase CLI locally
supabase migration up

# Or apply them manually through the Supabase Dashboard
# Go to SQL Editor and run each migration file in order
```

### 2. Create the Superadmin User

There are two options for creating the superadmin user:

#### Option A: Sign up through the UI (Recommended)

1. Go to the signup page: `/auth/signup`
2. Create an account with:
   - Email: `superadmin@example.com` (or your preferred email)
   - Password: `access123` (or your preferred password)
   - Full Name: `Super Admin`

3. After signup, run the following SQL in the Supabase SQL Editor to make this user a superadmin:

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'superadmin@example.com';

-- Update the user to be superadmin (replace USER_ID with the actual ID from above)
UPDATE user_profiles
SET
  is_superadmin = true,
  is_approved = true,
  approved_by = 'USER_ID',  -- Use the same user ID
  approved_at = NOW()
WHERE id = 'USER_ID';
```

#### Option B: Use the migration script

1. Edit `supabase/migrations/005_create_superadmin.sql`
2. Replace `'superadmin@example.com'` with your desired email
3. First, create the user account through Supabase Auth Dashboard or signup page
4. Then run the migration:

```bash
supabase migration up
```

### 3. Update Credentials (Production)

For production, you should:

1. Use a strong, unique email address
2. Use a strong password (minimum 12 characters, mix of upper/lower case, numbers, symbols)
3. Consider using a password manager

**Default credentials (for development only):**
- Email: `superadmin@example.com`
- Password: `access123`

⚠️ **Important**: Change these credentials immediately in production!

## How It Works

### User Flow

1. **New User Signs Up**
   - User creates account at `/auth/signup`
   - Account is created but `is_approved = false`
   - User sees "pending approval" message

2. **Superadmin Approves User**
   - Superadmin logs in and goes to `/admin`
   - Views list of pending users
   - Clicks "Approve" to grant access
   - User can now access the dashboard

3. **Approved User Accesses Dashboard**
   - User logs in at `/auth/login`
   - System checks if `is_approved = true`
   - User is redirected to dashboard

### Security Features

- **Row Level Security (RLS)**: All database access is protected
- **Superadmin-only functions**: Admin functions check for superadmin role
- **Approved user check**: Dashboard access requires approval
- **Protected admin route**: Only superadmins can access `/admin`

## Admin Panel Features

The admin panel (`/admin`) provides:

- **User List**: View all users with their status
- **Filters**: Filter by all users, pending, or approved
- **Approve Users**: Grant access to pending users
- **Revoke Access**: Remove approval from users (except superadmins)
- **Statistics**: View counts of total, pending, and approved users

## Database Schema

### user_profiles Table

```sql
- id: UUID (references auth.users)
- full_name: TEXT
- is_approved: BOOLEAN (default false)
- is_superadmin: BOOLEAN (default false)
- approval_notes: TEXT
- approved_by: UUID
- approved_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Functions

- `get_all_users_for_admin()`: Returns all users for admin panel
- `approve_user(target_user_id, notes)`: Approves a user
- `reject_user(target_user_id, notes)`: Revokes user approval

## Troubleshooting

### User can't access dashboard after approval

1. Check if user is approved:
```sql
SELECT is_approved FROM user_profiles WHERE id = 'USER_ID';
```

2. If false, approve the user:
```sql
UPDATE user_profiles SET is_approved = true WHERE id = 'USER_ID';
```

### Can't access admin panel

1. Check if user is superadmin:
```sql
SELECT is_superadmin FROM user_profiles WHERE id = 'USER_ID';
```

2. If false, make them superadmin:
```sql
UPDATE user_profiles SET is_superadmin = true WHERE id = 'USER_ID';
```

### No users showing in admin panel

1. Check RLS policies are applied
2. Verify the `get_all_users_for_admin()` function exists
3. Check browser console for errors

## Additional Notes

- The first superadmin must be created manually through SQL
- Superadmins cannot revoke their own access
- All approval actions are logged with timestamp and approver ID
- User profiles are automatically created when users sign up (via trigger)
