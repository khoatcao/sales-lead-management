export type Role = 'salesperson' | 'manager' | 'admin'
export type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'closed' | 'lost'
export type Priority = 'hot' | 'warm' | 'cold'
export type Condition = 'excellent' | 'good' | 'fair' | 'poor'
export type Urgency = 'urgent' | 'flexible' | 'no_rush'
export type NoteType = 'phone_call' | 'email' | 'meeting' | 'other'
export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  created_at: string
}

export interface CarPhoto {
  id: number
  url: string
  label: string
  sort_order: number
}

export interface CarFeature {
  id: number
  feature: string
}

export interface Car {
  id: number
  make: string
  model: string
  year: number
  mileage: number
  condition: Condition
  asking_price: string
  urgency: Urgency
  notes: string | null
  features: CarFeature[]
  photos: CarPhoto[]
}

export interface LeadNote {
  id: number
  note: string
  type: NoteType | null
  sentiment: Sentiment | null
  next_action: string | null
  ai_enriched: boolean
  created_at: string
  author: User
}

export interface LeadListItem {
  id: number
  seller_name: string
  seller_email: string
  seller_phone: string | null
  status: LeadStatus
  priority: Priority
  ai_score: number | null
  created_at: string
  car: Car | null
}

export interface LeadDetail extends LeadListItem {
  ai_summary: string | null
  salesperson: User | null
  notes: LeadNote[]
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  per_page: number
  items: T[]
}

export interface LeadCreateRequest {
  seller_name: string
  seller_email: string
  seller_phone?: string
  car: {
    make: string
    model: string
    year: number
    mileage: number
    condition: Condition
    asking_price: number
    urgency: Urgency
    notes?: string
    features: string[]
    photos: { url: string; label: string }[]
  }
}

export interface LeadUpdateRequest {
  status?: LeadStatus
  assigned_to?: number
}
