import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      <div className="relative w-full max-w-md min-h-screen bg-white overflow-hidden">
        {children}
      </div>
    </div>
  )
}
