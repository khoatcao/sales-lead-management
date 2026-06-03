import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listLeads } from '../api/leads'
import { useAuthStore } from '../store/authStore'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Pagination from '../components/Pagination'
import Layout from '../components/Layout'

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
  { value: 'hot', label: '🔥 Hot' },
  { value: 'warm', label: '☀️ Warm' },
  { value: 'cold', label: '❄️ Cold' },
]

export default function LeadsListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
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
    <Layout>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {data
              ? `${data.total} ${user?.role === 'salesperson' ? 'assigned to you' : 'total'} lead${data.total !== 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/leads/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Lead
        </button>
      </div>

      <main className="flex-1 px-8 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <select
            value={status}
            onChange={(e) => handleFilterChange(e.target.value, priority)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => handleFilterChange(status, e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {(status || priority) && (
            <button
              onClick={() => handleFilterChange('', '')}
              className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading leads...
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-red-500">Failed to load leads.</div>
        )}

        {data && data.items.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            {status || priority ? 'No leads match the selected filters.' : 'No leads yet. Create one to get started.'}
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Seller</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Car</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Priority</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">AI Score</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                            {lead.seller_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{lead.seller_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{lead.seller_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-700">
                          {lead.car ? `${lead.car.year} ${lead.car.make} ${lead.car.model}` : '—'}
                        </p>
                        {lead.car && (
                          <p className="text-xs text-slate-400 mt-0.5">${Number(lead.car.asking_price).toLocaleString()}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge priority={lead.priority} />
                      </td>
                      <td className="px-6 py-4">
                        {lead.ai_score != null ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${lead.ai_score >= 85 ? 'bg-red-500' : lead.ai_score >= 50 ? 'bg-orange-400' : 'bg-sky-400'}`}
                                style={{ width: `${lead.ai_score}%` }}
                              />
                            </div>
                            <span className={`font-bold tabular-nums text-sm ${lead.ai_score >= 85 ? 'text-red-600' : lead.ai_score >= 50 ? 'text-orange-500' : 'text-sky-500'}`}>
                              {lead.ai_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} perPage={20} total={data.total} onChange={setPage} />
          </>
        )}
      </main>
    </Layout>
  )
}
