import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardClient from './DashboardClient'

type OrganizationMember = {
  organization: {
    id: string
    name: string
    created_at: string
  }
  role: string
}

type Organization = {
  id: string
  name: string
  created_at: string
  role: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if user is approved
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('is_approved, is_superadmin')
    .eq('id', user.id)
    .single()

  if (!userProfile?.is_approved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Account Pending Approval</h1>
          <p className="text-gray-300 mb-6">
            Your account is currently pending approval from an administrator.
            You will receive access once your account has been reviewed and approved.
          </p>
          <form method="post" action="/auth/signout">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Get user's organizations
  const { data: organizations } = await supabase
    .from('organization_members')
    .select(`
      organization:organizations (
        id,
        name,
        created_at
      ),
      role
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const orgs: Organization[] = (organizations as OrganizationMember[] | null)?.map(om => ({
    ...om.organization,
    role: om.role
  })) || []

  // Get default organization (first one)
  const defaultOrgId = orgs[0]?.id

  // Get projects for the default organization
  let projects: any[] = []
  if (defaultOrgId) {
    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        prompt,
        created_at,
        sandboxes (
          id,
          daytona_sandbox_id,
          preview_url,
          status,
          created_at
        )
      `)
      .eq('organization_id', defaultOrgId)
      .order('created_at', { ascending: false })

    projects = projectsData || []
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-300">Welcome back, {user.email}</p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
          >
            + New Project
          </Link>
        </div>

        <DashboardClient
          user={user}
          organizations={orgs}
          initialProjects={projects}
          defaultOrgId={defaultOrgId}
        />
      </div>
    </div>
  )
}
