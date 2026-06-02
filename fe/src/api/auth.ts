import client from './client'
import type { TokenResponse, User } from '../types'

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/login', { email, password })
  return data
}

export async function register(payload: {
  name: string
  email: string
  password: string
  role: string
}): Promise<User> {
  const { data } = await client.post<User>('/auth/register', payload)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/users/me')
  return data
}
