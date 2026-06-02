import type { Priority } from '../types'

const styles: Record<Priority, string> = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-orange-100 text-orange-700',
  cold: 'bg-sky-100 text-sky-700',
}

const icons: Record<Priority, string> = {
  hot: '🔥',
  warm: '☀️',
  cold: '❄️',
}

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[priority]}`}>
      {icons[priority]} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}
