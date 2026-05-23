import { auth } from '../config/firebase'

// Firebase Auth 로그인 후 currentUser.uid를 반환
// ProtectedRoute 하위에서만 호출되므로 auth.currentUser는 항상 존재함
export function getUserId(): string {
  return auth.currentUser?.uid ?? 'user_demo'
}
