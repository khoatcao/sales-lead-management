import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import Layout from '../components/Layout'

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalyticsSummary,
  })

  const statusData = data
    ? Object.entries(data.by_status).map(([name, value]) => ({ name, value }))
    : []

  const priorityData = data
    ? Object.entries(data.by_priority).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: PRIORITY_COLORS[name],
      }))
    : []

  return (
    <Layout>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-400 mt-0.5">Pipeline overview and team performance</p>
      </div>

      <main className="flex-1 px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading analytics...
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-red-500">Failed to load analytics.</div>
        )}

        {data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-black text-slate-900">{data.total_leads}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hot Leads</p>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm">🔥</span>
                  </div>
                </div>
                <p className="text-4xl font-black text-red-500">{data.hot_leads}</p>
                <p className="text-xs text-slate-400 mt-1">Score ≥ 85</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Score</p>
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-black text-indigo-600">{data.avg_score}</p>
                <p className="text-xs text-slate-400 mt-1">Out of 100</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversion</p>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-black text-green-600">{data.conversion_rate}%</p>
                <p className="text-xs text-slate-400 mt-1">Closed / Total</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-5">Leads by Status</h3>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={3} dataKey="value">
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#e5e7eb'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                      <Legend formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-300 text-sm">No data yet</div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-5">Leads by Priority</h3>
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={priorityData} barSize={52}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {priorityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-300 text-sm">No data yet</div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-slate-700">Salesperson Performance</h3>
              </div>

              {data.leaderboard.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No salespeople found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Salesperson</th>
                      <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned</th>
                      <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Closed</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.leaderboard.map((sp, i) => (
                      <tr key={sp.name} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {sp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{sp.name}</p>
                              {i === 0 && sp.total > 0 && (
                                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Top performer</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 text-base">{sp.total}</td>
                        <td className="px-6 py-4 text-center font-bold text-green-600 text-base">{sp.closed}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${sp.conversion_rate}%` }} />
                            </div>
                            <span className="text-sm font-bold text-slate-600 w-12 text-right">{sp.conversion_rate}%</span>
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
    </Layout>
  )
}
