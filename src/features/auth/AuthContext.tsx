import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../config/firebase'
import type { AppUser } from '../../types'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      // 인증 상태가 바뀔 때마다 로딩 리셋 — 이게 없으면 재로그인 시
      // loading=false 상태에서 user=null이 잠깐 보여 /login으로 튕김
      setLoading(true)

      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) {
          setUser({
            id: firebaseUser.uid,
            ...snap.data(),
            createdAt: snap.data().createdAt?.toDate?.() ?? new Date(),
          } as AppUser)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('[AuthContext] Firestore 읽기 실패:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
