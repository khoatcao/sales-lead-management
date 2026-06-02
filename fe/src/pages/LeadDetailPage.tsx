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

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>
  if (isError || !lead) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">Lead not found.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/leads')} className="text-sm text-gray-500 hover:text-gray-800">
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{lead.seller_name}</h1>
        <div className="flex items-center gap-2 ml-2">
          <StatusBadge status={lead.status} />
          <PriorityBadge priority={lead.priority} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* AI Summary */}
          {lead.ai_summary && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">AI Summary</p>
              <p className="text-sm text-indigo-900">{lead.ai_summary}</p>
            </div>
          )}

          {/* Car Details */}
          {lead.car && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Car Details</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Make / Model</p>
                  <p className="font-medium text-gray-800">{lead.car.year} {lead.car.make} {lead.car.model}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Asking Price</p>
                  <p className="font-medium text-gray-800">${Number(lead.car.asking_price).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Mileage</p>
                  <p className="font-medium text-gray-800">{lead.car.mileage.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Condition</p>
                  <p className="font-medium text-gray-800 capitalize">{lead.car.condition}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Urgency</p>
                  <p className="font-medium text-gray-800 capitalize">{lead.car.urgency.replace('_', ' ')}</p>
                </div>
              </div>

              {lead.car.features.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-400 text-xs mb-1">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.car.features.map((f) => (
                      <span key={f.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {f.feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {lead.car.photos.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-400 text-xs mb-2">Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {lead.car.photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-20 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = ''
                            ;(e.target as HTMLImageElement).className = 'hidden'
                          }}
                        />
                        <span className="text-xs text-gray-400 capitalize">{photo.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lead.car.notes && (
                <div className="mt-3">
                  <p className="text-gray-400 text-xs mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{lead.car.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Activity Notes ({lead.notes.length})
            </h2>

            <div className="space-y-3 mb-4">
              {lead.notes.length === 0 && (
                <p className="text-sm text-gray-400">No notes yet.</p>
              )}
              {lead.notes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={() => noteText.trim() && noteMutation.mutate(noteText.trim())}
                disabled={!noteText.trim() || noteMutation.isPending}
                className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {noteMutation.isPending ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Seller Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Seller</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">{lead.seller_name}</p>
              <p className="text-gray-500">{lead.seller_email}</p>
              {lead.seller_phone && <p className="text-gray-500">{lead.seller_phone}</p>}
            </div>
          </div>

          {/* AI Score */}
          {lead.ai_score != null && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">AI Score</h2>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-gray-900">{lead.ai_score}</span>
                <span className="text-gray-400 text-sm mb-1">/ 100</span>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${lead.ai_score}%` }}
                />
              </div>
            </div>
          )}

          {/* Update Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h2>
            <select
              value={lead.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value as LeadStatus })}
              disabled={updateMutation.isPending}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Assign To — manager/admin only */}
          {isManagerOrAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Assign To</h2>
              <select
                value={lead.salesperson?.id ?? ''}
                onChange={(e) =>
                  updateMutation.mutate({ assigned_to: Number(e.target.value) || undefined })
                }
                disabled={updateMutation.isPending}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assigned To — salesperson view (read-only) */}
          {!isManagerOrAdmin && lead.salesperson && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Assigned To</h2>
              <p className="text-sm text-gray-800">{lead.salesperson.name}</p>
              <p className="text-xs text-gray-400">{lead.salesperson.email}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-400 space-y-1">
            <p>Created {new Date(lead.created_at).toLocaleString()}</p>
            <p>Lead #{lead.id}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
