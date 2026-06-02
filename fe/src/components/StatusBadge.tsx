import type { LeadStatus } from '../types'

const styles: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  negotiating: 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
  lost: 'bg-gray-100 text-gray-600',
}

const labels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  negotiating: 'Negotiating',
  closed: 'Closed',
  lost: 'Lost',
}

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
