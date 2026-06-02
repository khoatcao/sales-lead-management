import type { LeadNote, Sentiment } from '../types'

const sentimentColor: Record<Sentiment, string> = {
  positive: 'text-green-600',
  neutral: 'text-gray-500',
  negative: 'text-red-600',
}

const noteTypeLabel: Record<string, string> = {
  phone_call: 'Phone Call',
  email: 'Email',
  meeting: 'Meeting',
  other: 'Other',
}

export default function NoteItem({ note }: { note: LeadNote }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {note.type && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {noteTypeLabel[note.type] ?? note.type}
            </span>
          )}
          {note.sentiment && (
            <span className={`text-xs font-medium ${sentimentColor[note.sentiment]}`}>
              {note.sentiment.charAt(0).toUpperCase() + note.sentiment.slice(1)}
            </span>
          )}
          {note.ai_enriched && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">AI</span>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(note.created_at).toLocaleDateString()}
        </span>
      </div>

      <p className="text-sm text-gray-800">{note.note}</p>

      {note.next_action && (
        <p className="mt-2 text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1">
          Next: {note.next_action}
        </p>
      )}

      <p className="mt-2 text-xs text-gray-400">by {note.author.name}</p>
    </div>
  )
}
