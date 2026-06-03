import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listLeads } from '../api/leads'
import { useAuthStore } from '../store/authStore'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Pagination from '../components/Pagination'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
]

export default function LeadsListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leads', page, status, priority],
    queryFn: () => listLeads(page, 20, status, priority),
  })

  function handleFilterChange(newStatus: string, newPriority: string) {
    setPage(1)
    setStatus(newStatus)
    setPriority(newPriority)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">LeadIQ</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-700">{user?.name?.charAt(0)}</span>
            </div>
            <span className="text-sm text-gray-600 font-medium">{user?.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
          </div>
          <button
            onClick={() => { queryClient.clear(); logout(); navigate('/login') }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => handleFilterChange(e.target.value, priority)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => handleFilterChange(status, e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {(status || priority) && (
              <button
                onClick={() => handleFilterChange('', '')}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Clear filters
              </button>
            )}

            <p className="text-sm text-gray-400">
              {data
                ? `${data.total} ${user?.role === 'salesperson' ? 'assigned to you' : 'total'} lead${data.total !== 1 ? 's' : ''}`
                : ''}
            </p>
          </div>

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
          <div className="text-center py-12 text-gray-400">
            {status || priority ? 'No leads match the selected filters.' : 'No leads yet. Create one to get started.'}
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 uppercase tracking-wide text-xs">Seller</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 uppercase tracking-wide text-xs">Car</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 uppercase tracking-wide text-xs">Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 uppercase tracking-wide text-xs">Priority</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 uppercase tracking-wide text-xs">AI Score</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500 uppercase tracking-wide text-xs">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{lead.seller_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{lead.seller_email}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {lead.car
                          ? `${lead.car.year} ${lead.car.make} ${lead.car.model}`
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-5 py-4">
                        <PriorityBadge priority={lead.priority} />
                      </td>
                      <td className="px-5 py-4">
                        {lead.ai_score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${lead.ai_score >= 85 ? 'bg-red-500' : lead.ai_score >= 50 ? 'bg-orange-400' : 'bg-sky-400'}`}
                                style={{ width: `${lead.ai_score}%` }}
                              />
                            </div>
                            <span className="font-semibold text-gray-800 tabular-nums">{lead.ai_score}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
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
