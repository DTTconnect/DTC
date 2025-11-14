# Database Migrations

This folder contains SQL migrations for the multi-tenant project management system.

## How to Apply Migrations

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to the **SQL Editor** in the left sidebar
4. Run each migration file in order:
   - `001_initial_schema.sql` - Creates tables and indexes
   - `002_row_level_security.sql` - Sets up RLS policies for data isolation
   - `003_helper_functions.sql` - Creates helper functions and triggers

## What These Migrations Do

### 001_initial_schema.sql
- Creates `organizations` table for teams/companies
- Creates `organization_members` table to link users to organizations with roles
- Creates `projects` table to store project metadata
- Creates `sandboxes` table to track Daytona sandbox instances
- Adds indexes for performance
- Sets up automatic `updated_at` triggers

### 002_row_level_security.sql
- Enables Row Level Security (RLS) on all tables
- Creates policies so users can only see their organization's data
- Implements role-based access (owner, admin, member)
- Ensures data isolation between teams

### 003_helper_functions.sql
- Creates `handle_new_user()` trigger function that automatically:
  - Creates a default organization when a user signs up
  - Adds the user as the owner of that organization
- Creates helper functions for common queries:
  - `get_user_organizations()` - Get all orgs a user belongs to
  - `get_organization_projects()` - Get projects for an organization

## Database Schema

```
organizations
├── id (uuid, pk)
├── name (text)
├── created_at (timestamp)
└── updated_at (timestamp)

organization_members
├── id (uuid, pk)
├── organization_id (uuid, fk → organizations)
├── user_id (uuid, fk → auth.users)
├── role (text: owner|admin|member)
└── created_at (timestamp)

projects
├── id (uuid, pk)
├── organization_id (uuid, fk → organizations)
├── created_by (uuid, fk → auth.users)
├── name (text)
├── prompt (text)
├── created_at (timestamp)
└── updated_at (timestamp)

sandboxes
├── id (uuid, pk)
├── project_id (uuid, fk → projects)
├── daytona_sandbox_id (text, unique)
├── preview_url (text)
├── status (text: active|stopped|deleted)
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Testing the Schema

After applying migrations, you can test with:

```sql
-- View your organizations
SELECT * FROM get_user_organizations();

-- View projects for a specific organization
SELECT * FROM get_organization_projects('your-org-id-here');

-- Check if RLS is working (should only see your data)
SELECT * FROM projects;
```
