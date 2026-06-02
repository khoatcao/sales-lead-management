import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listLeads } from '../api/leads'
import { useAuthStore } from '../store/authStore'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Pagination from '../components/Pagination'

export default function LeadsListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leads', page],
    queryFn: () => listLeads(page, 20),
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Sales Leads</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={() => { queryClient.clear(); logout(); navigate('/login') }}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {data
              ? `${data.total} ${user?.role === 'salesperson' ? 'assigned to you' : 'total'} lead${data.total !== 1 ? 's' : ''}`
              : ''}
          </p>
          <button
            onClick={() => navigate('/leads/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Lead
          </button>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-gray-400">Loading leads...</div>
        )}

        {isError && (
          <div className="text-center py-12 text-red-500">Failed to load leads.</div>
        )}

        {data && data.items.length === 0 && (
          <div className="text-center py-12 text-gray-400">No leads yet. Create one to get started.</div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Seller</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Car</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.seller_name}</p>
                        <p className="text-xs text-gray-400">{lead.seller_email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {lead.car
                          ? `${lead.car.year} ${lead.car.make} ${lead.car.model}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={lead.priority} />
                      </td>
                      <td className="px-4 py-3">
                        {lead.ai_score != null ? (
                          <span className="font-semibold text-gray-800">{lead.ai_score}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              perPage={20}
              total={data.total}
              onChange={setPage}
            />
          </>
        )}
      </main>
    </div>
  )
}
