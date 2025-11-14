'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  role: string
  created_at: string
}

interface Sandbox {
  id: string
  daytona_sandbox_id: string
  preview_url: string | null
  status: string
  created_at: string
}

interface Project {
  id: string
  name: string
  prompt: string
  created_at: string
  sandboxes: Sandbox[]
}

interface Props {
  user: any
  organizations: Organization[]
  initialProjects: Project[]
  defaultOrgId: string
}

export default function DashboardClient({ user, organizations, initialProjects, defaultOrgId }: Props) {
  const router = useRouter()
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId)
  const [projects, setProjects] = useState<Project[]>(initialProjects)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleOrgChange = async (orgId: string) => {
    setSelectedOrgId(orgId)

    // Fetch projects for the selected organization
    const supabase = createClient()
    const { data } = await supabase
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
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    setProjects(data || [])
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Organization Selector & User Menu */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Organization
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="w-full md:w-auto px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id} className="bg-gray-800">
                  {org.name} ({org.role})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-6">Your Projects</h2>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No projects yet</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
              >
                <h3 className="text-xl font-semibold text-white mb-2 truncate">
                  {project.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {project.prompt}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Sandboxes:</span>
                    <span className="text-white font-semibold">
                      {project.sandboxes.length}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created {formatDate(project.created_at)}
                  </div>
                </div>

                {project.sandboxes.length > 0 && project.sandboxes[0].preview_url && (
                  <a
                    href={project.sandboxes[0].preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    Open Preview
                  </a>
                )}

                {project.sandboxes.length === 0 && (
                  <div className="text-center py-2 px-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <span className="text-yellow-200 text-sm">
                      No active sandbox
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="text-gray-400 text-sm mb-2">Total Projects</div>
          <div className="text-3xl font-bold text-white">{projects.length}</div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="text-gray-400 text-sm mb-2">Active Sandboxes</div>
          <div className="text-3xl font-bold text-white">
            {projects.reduce((acc, p) => acc + p.sandboxes.filter(s => s.status === 'active').length, 0)}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="text-gray-400 text-sm mb-2">Organizations</div>
          <div className="text-3xl font-bold text-white">{organizations.length}</div>
        </div>
      </div>
    </>
  )
}
