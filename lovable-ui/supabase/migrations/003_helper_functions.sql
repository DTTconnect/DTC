-- Function to automatically create a default organization for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
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

-- Trigger to create organization when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to get user's organizations with member count
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  role TEXT,
  member_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    om.role,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count,
    o.created_at
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get projects with sandbox count for an organization
CREATE OR REPLACE FUNCTION public.get_organization_projects(org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  prompt TEXT,
  created_by UUID,
  creator_email TEXT,
  sandbox_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.prompt,
    p.created_by,
    u.email as creator_email,
    (SELECT COUNT(*) FROM sandboxes WHERE project_id = p.id) as sandbox_count,
    p.created_at,
    p.updated_at
  FROM projects p
  LEFT JOIN auth.users u ON p.created_by = u.id
  WHERE p.organization_id = org_id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
