# Multi-Tenant Sign-In Setup Guide

This guide will help you set up multi-tenant authentication for your Lovable Clone application using Supabase.

## Overview

The app now includes:
- **User Authentication** (email/password via Supabase)
- **Multi-tenant Organization System** (teams can only see their own projects)
- **Row Level Security (RLS)** for data isolation
- **Project & Sandbox Tracking** in PostgreSQL database
- **Dashboard** to view all projects per organization

---

## Step 1: Database Setup

You need to run the SQL migrations in your Supabase dashboard to create the database schema.

### 1.1 Access Supabase SQL Editor

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `hfxaqpjtjpljbyjfkicg`
3. Click **SQL Editor** in the left sidebar

### 1.2 Run Migrations

Run each migration file **in order**:

#### Migration 1: Initial Schema

Copy and paste the contents of `supabase/migrations/001_initial_schema.sql` and click **Run**.

This creates:
- `organizations` table
- `organization_members` table (links users to organizations)
- `projects` table
- `sandboxes` table
- Indexes for performance
- Auto-update triggers for `updated_at` columns

#### Migration 2: Row Level Security

Copy and paste the contents of `supabase/migrations/002_row_level_security.sql` and click **Run**.

This sets up:
- RLS policies so users only see their organization's data
- Role-based access control (owner, admin, member)
- Automatic data isolation between teams

#### Migration 3: Helper Functions

Copy and paste the contents of `supabase/migrations/003_helper_functions.sql` and click **Run**.

This creates:
- Auto-create default organization when user signs up
- Helper functions for common queries
- Automatic user onboarding

### 1.3 Verify Database Setup

Run this query to verify everything is set up correctly:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'organization_members', 'projects', 'sandboxes');
```

You should see all 4 tables listed.

---

## Step 2: Configure Authentication in Supabase

### 2.1 Disable Email Confirmation (for faster testing)

1. Go to **Authentication** → **Settings** in Supabase dashboard
2. Under **Email Auth**, find "Confirm email"
3. Toggle it **OFF** (this allows instant sign-up without email verification)
4. Click **Save**

> **Note:** For production, you should enable email confirmation and configure an email provider.

### 2.2 Configure Redirect URLs (Optional)

If you're deploying to Vercel or a custom domain:

1. Go to **Authentication** → **URL Configuration**
2. Add your production URL to **Site URL**
3. Add redirect URLs to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.vercel.app/auth/callback`

---

## Step 3: Environment Variables

The environment variables are already set up in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hfxaqpjtjpljbyjfkicg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

These are also configured in your Vercel project settings.

---

## Step 4: How It Works

### User Flow

1. **Sign Up** (`/auth/signup`)
   - User creates account with email/password
   - Trigger automatically creates a default organization
   - User is added as the owner of that organization

2. **Login** (`/auth/login`)
   - User signs in with email/password
   - Session is stored in cookies via middleware

3. **Create Project** (`/` → `/generate`)
   - User enters a prompt
   - System checks authentication
   - Gets user's default organization
   - Creates project record in database
   - Generates code in Daytona sandbox
   - Saves sandbox details (ID, preview URL)

4. **View Projects** (`/dashboard`)
   - Shows all projects for the selected organization
   - Users can switch between organizations if they belong to multiple
   - Each project shows sandbox status and preview link

### Data Isolation (Row Level Security)

RLS ensures that:
- Users can only see projects from organizations they're members of
- No SQL queries needed in your code to filter by organization
- Database automatically enforces access control
- Cross-team data leaks are impossible

### Organization Roles

Three roles are supported:

- **Owner**: Full control, can delete organization
- **Admin**: Can invite/remove members, manage projects
- **Member**: Can create projects, view organization projects

---

## Step 5: Testing the System

### 5.1 Create First User

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Click **Get started**
4. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
5. Click **Sign Up**

### 5.2 Verify Organization Created

In Supabase SQL Editor, run:

```sql
SELECT o.name, u.email, om.role
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users u ON om.user_id = u.id;
```

You should see your user's organization.

### 5.3 Create a Project

1. On the homepage, enter a prompt (e.g., "Create a todo app")
2. You'll be taken to `/generate`
3. Watch the code generation process
4. Once complete, the preview URL will display

### 5.4 View Dashboard

1. Click **Dashboard** in the navbar
2. You should see:
   - Your organization name
   - The project you just created
   - Sandbox status and preview link
   - Statistics (total projects, sandboxes, organizations)

### 5.5 Test Multi-Tenancy

1. Open an **Incognito/Private window**
2. Create a second user: `test2@example.com`
3. Create a project as that user
4. Go back to the first window (first user)
5. Refresh dashboard - you should **NOT** see the second user's project
6. This confirms data isolation is working!

---

## Step 6: Inviting Team Members (Future Feature)

Currently, each user gets their own organization on signup. To add multi-user organizations:

### Option A: Manual via SQL

```sql
-- Add user2 to user1's organization
INSERT INTO organization_members (organization_id, user_id, role)
VALUES ('org-id-here', 'user-id-here', 'member');
```

### Option B: Build an Invite Feature

You can add pages to:
1. List organization members
2. Generate invite links
3. Allow users to accept invites
4. Remove members

This would require:
- `/dashboard/team` page
- `POST /api/invites` endpoint
- Email invite system

---

## API Changes Summary

### `/api/generate-daytona` (Updated)

**Before:**
```typescript
POST /api/generate-daytona
Body: { prompt: string }
```

**After:**
```typescript
POST /api/generate-daytona
Body: { prompt: string, organizationId: string }
Headers: { Cookie: supabase-auth-token }

Response (on complete):
{
  type: "complete",
  projectId: "uuid",
  sandboxId: "daytona-id",
  previewUrl: "https://..."
}
```

**New Behavior:**
- Requires authentication (401 if not logged in)
- Verifies user is member of organization (403 if not)
- Creates `project` record in database
- Creates `sandbox` record linked to project
- Returns `projectId` for dashboard linking

---

## Database Schema Reference

```
┌──────────────────┐
│  organizations   │
├──────────────────┤
│ id (PK)          │
│ name             │
│ created_at       │
│ updated_at       │
└──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────┐
│ organization_members │
├──────────────────────┤
│ id (PK)              │
│ organization_id (FK) │
│ user_id (FK)         │◄─── auth.users
│ role                 │
│ created_at           │
└──────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│    projects      │
├──────────────────┤
│ id (PK)          │
│ organization_id  │
│ created_by (FK)  │◄─── auth.users
│ name             │
│ prompt           │
│ created_at       │
│ updated_at       │
└──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│    sandboxes     │
├──────────────────┤
│ id (PK)          │
│ project_id (FK)  │
│ daytona_sandbox_id│
│ preview_url      │
│ status           │
│ created_at       │
│ updated_at       │
└──────────────────┘
```

---

## Troubleshooting

### Issue: "No organization found" error

**Cause:** The trigger that auto-creates organizations didn't run.

**Fix:**
```sql
-- Manually create organization for existing user
INSERT INTO organizations (name) VALUES ('My Organization')
RETURNING id;

-- Add user to organization (replace IDs)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES ('org-id', 'user-id', 'owner');
```

### Issue: Can't see projects in dashboard

**Cause:** RLS policies might not be working.

**Fix:**
```sql
-- Check if user is member of organization
SELECT * FROM organization_members WHERE user_id = 'your-user-id';

-- Check if projects exist
SELECT * FROM projects WHERE organization_id = 'your-org-id';

-- Disable RLS temporarily to test (NOT for production!)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
```

### Issue: Authentication not working

**Cause:** Cookies not being set properly.

**Fix:**
1. Clear browser cookies for `localhost`
2. Check that middleware is running (should log requests)
3. Verify `.env.local` has correct Supabase keys
4. Restart dev server

### Issue: TypeScript errors

**Cause:** Supabase types not generated.

**Fix:**
```bash
npm install @supabase/supabase-js@latest
```

---

## Next Steps

### Recommended Enhancements

1. **Email Invitations**
   - Build UI to invite team members
   - Send email invites via Supabase
   - Accept/decline flow

2. **Project Sharing**
   - Share project previews publicly
   - Generate shareable links
   - Embed sandboxes

3. **Sandbox Management**
   - Stop/start sandboxes
   - Delete old sandboxes
   - Sandbox usage analytics

4. **Billing Integration**
   - Track sandbox usage per organization
   - Implement usage limits
   - Stripe integration

5. **OAuth Providers**
   - GitHub login
   - Google login
   - Microsoft login

---

## Security Best Practices

✅ **Enabled:**
- Row Level Security on all tables
- Server-side authentication checks
- Prepared statements (SQL injection protection)
- HTTPS enforced by Supabase

⚠️ **Recommended:**
- Enable email confirmation in production
- Add rate limiting to API routes
- Implement CSRF protection
- Add 2FA for organization owners
- Regular security audits

---

## Support

If you encounter issues:

1. Check Supabase logs: **Dashboard → Logs**
2. Check Next.js logs: Terminal output
3. Check browser console: F12 → Console
4. Verify database: SQL Editor queries

For Supabase-specific issues, see: https://supabase.com/docs
