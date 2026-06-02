import client from './client'
import type { LeadCreateRequest, LeadDetail, LeadListItem, LeadUpdateRequest, PaginatedResponse } from '../types'

export async function listLeads(page = 1, perPage = 20): Promise<PaginatedResponse<LeadListItem>> {
  const { data } = await client.get<PaginatedResponse<LeadListItem>>('/leads', {
    params: { page, per_page: perPage },
  })
  return data
}

export async function getLead(id: number): Promise<LeadDetail> {
  const { data } = await client.get<LeadDetail>(`/leads/${id}`)
  return data
}

export async function createLead(payload: LeadCreateRequest): Promise<LeadDetail> {
  const { data } = await client.post<LeadDetail>('/leads', payload)
  return data
}

export async function updateLead(id: number, payload: LeadUpdateRequest): Promise<LeadDetail> {
  const { data } = await client.patch<LeadDetail>(`/leads/${id}`, payload)
  return data
}
