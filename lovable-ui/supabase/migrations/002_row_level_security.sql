-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandboxes ENABLE ROW LEVEL SECURITY;

-- Organizations policies
-- Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create organizations (they'll be added as owner separately)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only owners can update organizations
CREATE POLICY "Owners can update their organizations"
  ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can delete organizations
CREATE POLICY "Owners can delete their organizations"
  ON organizations
  FOR DELETE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Organization members policies
-- Users can view members of their organizations
CREATE POLICY "Users can view members of their organizations"
  ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Owners and admins can add members
CREATE POLICY "Owners and admins can add members"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update members
CREATE POLICY "Owners and admins can update members"
  ON organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can remove members
CREATE POLICY "Owners and admins can remove members"
  ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Projects policies
-- Users can view projects from their organizations
CREATE POLICY "Users can view organization projects"
  ON projects
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create projects in their organizations
CREATE POLICY "Users can create projects in their organizations"
  ON projects
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON projects
  FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON projects
  FOR DELETE
  USING (created_by = auth.uid());

-- Sandboxes policies
-- Users can view sandboxes from their organization's projects
CREATE POLICY "Users can view organization sandboxes"
  ON sandboxes
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create sandboxes for their organization's projects
CREATE POLICY "Users can create sandboxes for organization projects"
  ON sandboxes
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update sandboxes they created
CREATE POLICY "Users can update sandboxes for their projects"
  ON sandboxes
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid()
    )
  );

-- Users can delete sandboxes they created
CREATE POLICY "Users can delete sandboxes for their projects"
  ON sandboxes
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid()
    )
  );
