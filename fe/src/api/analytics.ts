import client from './client'

export interface AnalyticsSummary {
  total_leads: number
  hot_leads: number
  avg_score: number
  conversion_rate: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  leaderboard: {
    name: string
    total: number
    closed: number
    conversion_rate: number
  }[]
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await client.get<AnalyticsSummary>('/analytics/summary')
  return data
}
