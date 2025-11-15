import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if user is superadmin
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!userProfile?.is_superadmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">
            You do not have permission to access the admin panel.
          </p>
          <a
            href="/dashboard"
            className="block w-full text-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Get all users using the RPC function
  const { data: users, error: usersError } = await supabase
    .rpc('get_all_users_for_admin')

  if (usersError) {
    console.error('Error fetching users:', usersError)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-300">Manage user approvals and permissions</p>
          </div>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-white/10 backdrop-blur-lg text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
          >
            Back to Dashboard
          </a>
        </div>

        <AdminClient users={users || []} />
      </div>
    </div>
  )
}
