import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLead, updateLead } from '../api/leads'
import { createNote } from '../api/notes'
import { listUsers } from '../api/users'
import { useAuthStore } from '../store/authStore'
import type { LeadStatus } from '../types'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import NoteItem from '../components/NoteItem'
import Layout from '../components/Layout'

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'negotiating', 'closed', 'lost']

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const leadId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [noteText, setNoteText] = useState('')
  const currentUser = useAuthStore((s) => s.user)
  const isManagerOrAdmin = currentUser?.role === 'manager' || currentUser?.role === 'admin'

  const { data: lead, isLoading, isError } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLead(leadId),
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: isManagerOrAdmin,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { status?: LeadStatus; assigned_to?: number }) =>
      updateLead(leadId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead', leadId] }),
  })

  const noteMutation = useMutation({
    mutationFn: (note: string) => createNote(leadId, note),
    onSuccess: () => {
      setNoteText('')
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
    },
  })

  if (isLoading) return (
    <Layout>
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading...
      </div>
    </Layout>
  )

  if (isError || !lead) return (
    <Layout>
      <div className="flex-1 flex items-center justify-center text-red-500">Lead not found.</div>
    </Layout>
  )

  const scoreColor = lead.ai_score != null
    ? lead.ai_score >= 85 ? 'text-red-600' : lead.ai_score >= 50 ? 'text-orange-500' : 'text-sky-500'
    : 'text-slate-400'

  const scoreBarColor = lead.ai_score != null
    ? lead.ai_score >= 85 ? 'bg-red-500' : lead.ai_score >= 50 ? 'bg-orange-400' : 'bg-sky-400'
    : 'bg-slate-200'

  return (
    <Layout>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate('/leads')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Leads
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-700 font-medium">{lead.seller_name}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
              {lead.seller_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{lead.seller_name}</h1>
              <p className="text-sm text-slate-400">{lead.seller_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
          </div>
        </div>
      </div>

      <main className="flex-1 px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* AI Summary */}
          {lead.ai_summary && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">AI Summary</p>
              </div>
              <p className="text-sm text-indigo-900 leading-relaxed">{lead.ai_summary}</p>
            </div>
          )}

          {/* Car Details */}
          {lead.car && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <h2 className="text-sm font-semibold text-slate-700">
                  {lead.car.year} {lead.car.make} {lead.car.model}
                </h2>
                <span className="ml-auto text-sm font-bold text-slate-900">
                  ${Number(lead.car.asking_price).toLocaleString()}
                </span>
              </div>

              {/* Photos */}
              {lead.car.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-1 p-1">
                  {lead.car.photos.map((photo, i) => (
                    <div key={photo.id} className={`relative ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                      <img
                        src={photo.url}
                        alt={photo.label}
                        className="w-full h-36 object-cover"
                        style={i === 0 ? { height: '18rem' } : {}}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="absolute bottom-2 left-2 text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded capitalize">
                        {photo.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">Mileage</p>
                    <p className="font-semibold text-slate-800">{lead.car.mileage.toLocaleString()} km</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">Condition</p>
                    <p className="font-semibold text-slate-800 capitalize">{lead.car.condition}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">Urgency</p>
                    <p className="font-semibold text-slate-800 capitalize">{lead.car.urgency.replace('_', ' ')}</p>
                  </div>
                </div>

                {lead.car.features.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Features</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.car.features.map((f) => (
                        <span key={f.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-medium">
                          {f.feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Notes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-700">Activity</h2>
              <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{lead.notes.length}</span>
            </div>

            <div className="p-6 space-y-3">
              {lead.notes.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No activity yet. Add the first note below.</p>
              )}
              {lead.notes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </div>

            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log a call, email, or meeting note..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50 placeholder:text-slate-400"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => noteText.trim() && noteMutation.mutate(noteText.trim())}
                  disabled={!noteText.trim() || noteMutation.isPending}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {noteMutation.isPending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* AI Score */}
          {lead.ai_score != null && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">AI Score</p>
              <div className="flex items-end gap-2 mb-3">
                <span className={`text-5xl font-black ${scoreColor}`}>{lead.ai_score}</span>
                <span className="text-slate-400 text-sm mb-1.5">/ 100</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${scoreBarColor} rounded-full transition-all`} style={{ width: `${lead.ai_score}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {lead.ai_score >= 85 ? 'High conversion likelihood' : lead.ai_score >= 50 ? 'Moderate interest' : 'Low priority'}
              </p>
            </div>
          )}

          {/* Seller Info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Seller</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">
                {lead.seller_name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{lead.seller_name}</p>
                <p className="text-xs text-slate-400">{lead.seller_email}</p>
              </div>
            </div>
            {lead.seller_phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {lead.seller_phone}
              </div>
            )}
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Status</p>
            <select
              value={lead.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value as LeadStatus })}
              disabled={updateMutation.isPending}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium text-slate-700"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Assign To */}
          {isManagerOrAdmin && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Assigned To</p>
              <select
                value={lead.salesperson?.id ?? ''}
                onChange={(e) => updateMutation.mutate({ assigned_to: Number(e.target.value) || undefined })}
                disabled={updateMutation.isPending}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium text-slate-700"
              >
                <option value="">Unassigned</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          {!isManagerOrAdmin && lead.salesperson && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Assigned To</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                  {lead.salesperson.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{lead.salesperson.name}</p>
                  <p className="text-xs text-slate-400">{lead.salesperson.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-slate-50 rounded-2xl border border-gray-100 p-4 text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Lead ID</span>
              <span className="font-mono text-slate-500">#{lead.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span>{new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  )
}
