const KEY = 'culture_go_user_id'

export function getUserId(): string {
  const stored = localStorage.getItem(KEY)
  if (stored) return stored
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem(KEY, id)
  return id
}
