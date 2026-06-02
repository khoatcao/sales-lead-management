import client from './client'
import type { LeadNote } from '../types'

export async function createNote(leadId: number, note: string): Promise<LeadNote> {
  const { data } = await client.post<LeadNote>(`/leads/${leadId}/notes`, { note })
  return data
}

export async function listNotes(leadId: number): Promise<LeadNote[]> {
  const { data } = await client.get<LeadNote[]>(`/leads/${leadId}/notes`)
  return data
}
