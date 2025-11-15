'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  email: string
  full_name: string | null
  is_approved: boolean
  is_superadmin: boolean
  approval_notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export default function AdminClient({ users: initialUsers }: { users: User[] }) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  const handleApprove = async (userId: string) => {
    setLoading(userId)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('approve_user', {
        target_user_id: userId,
        notes: 'Approved by admin'
      })

      if (error) throw error

      // Refresh the page to get updated data
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to approve user')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async (userId: string) => {
    setLoading(userId)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('reject_user', {
        target_user_id: userId,
        notes: 'Rejected by admin'
      })

      if (error) throw error

      // Refresh the page to get updated data
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to reject user')
    } finally {
      setLoading(null)
    }
  }

  const filteredUsers = users.filter(user => {
    if (filter === 'pending') return !user.is_approved
    if (filter === 'approved') return user.is_approved
    return true
  })

  const pendingCount = users.filter(u => !u.is_approved).length
  const approvedCount = users.filter(u => u.is_approved).length

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'all'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          All Users ({users.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'pending'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'approved'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Approved ({approvedCount})
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Created</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white">
                      {user.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_approved ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/50">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_superadmin ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/50">
                          Superadmin
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {!user.is_approved ? (
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={loading === user.id}
                            className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                          >
                            {loading === user.id ? 'Approving...' : 'Approve'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReject(user.id)}
                            disabled={loading === user.id || user.is_superadmin}
                            className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                          >
                            {loading === user.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-gray-400 text-sm font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-gray-400 text-sm font-semibold mb-2">Pending Approval</h3>
          <p className="text-3xl font-bold text-yellow-300">{pendingCount}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-gray-400 text-sm font-semibold mb-2">Approved Users</h3>
          <p className="text-3xl font-bold text-green-300">{approvedCount}</p>
        </div>
      </div>
    </div>
  )
}
