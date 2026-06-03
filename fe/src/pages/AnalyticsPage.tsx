import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { getAnalyticsSummary } from '../api/analytics'
import { useAuthStore } from '../store/authStore'

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  negotiating: '#8b5cf6',
  closed: '#10b981',
  lost: '#9ca3af',
}

const PRIORITY_COLORS: Record<string, string> = {
  hot: '#ef4444',
  warm: '#f97316',
  cold: '#38bdf8',
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalyticsSummary,
  })

  const statusData = data
    ? Object.entries(data.by_status).map(([name, value]) => ({ name, value }))
    : []

  const priorityData = data
    ? Object.entries(data.by_priority).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: PRIORITY_COLORS[name] }))
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">LeadIQ</h1>
        </div>
        <nav className="flex items-center gap-6">
          <button onClick={() => navigate('/leads')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Leads</button>
          <button className="text-sm text-blue-600 font-semibold border-b-2 border-blue-600 pb-0.5">Analytics</button>
        </nav>
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

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Pipeline overview and team performance</p>
        </div>

        {isLoading && <div className="text-center py-20 text-gray-400">Loading analytics...</div>}
        {isError && <div className="text-center py-20 text-red-500">Failed to load analytics.</div>}

        {data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900">{data.total_leads}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hot Leads</p>
                <p className="text-3xl font-bold text-red-500">{data.hot_leads}</p>
                <p className="text-xs text-gray-400 mt-1">Score ≥ 85</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Avg AI Score</p>
                <p className="text-3xl font-bold text-blue-600">{data.avg_score}</p>
                <p className="text-xs text-gray-400 mt-1">Out of 100</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Conversion Rate</p>
                <p className="text-3xl font-bold text-green-600">{data.conversion_rate}%</p>
                <p className="text-xs text-gray-400 mt-1">Closed / Total</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Status donut */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Leads by Status</h3>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#e5e7eb'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                      <Legend formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-300 text-sm">No data</div>
                )}
              </div>

              {/* Priority bar */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Leads by Priority</h3>
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={priorityData} barSize={48}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {priorityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-300 text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Salesperson Leaderboard */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Salesperson Performance</h3>
              {data.leaderboard.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No salespeople found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Salesperson</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Assigned</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Closed</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.leaderboard.map((sp, i) => (
                      <tr key={sp.name} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {sp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{sp.name}</p>
                              {i === 0 && sp.total > 0 && <p className="text-xs text-amber-500 font-medium">Top performer</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-gray-700">{sp.total}</td>
                        <td className="py-3 px-3 text-center font-semibold text-green-600">{sp.closed}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${sp.conversion_rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 w-10 text-right">{sp.conversion_rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
