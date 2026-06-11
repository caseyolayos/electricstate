'use client'

import { UserProvider } from '@/lib/mockStore'
import { AuthProvider } from '@/lib/auth'
import NativeNotifications from '@/components/NativeNotifications'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <NativeNotifications />
        {children}
      </UserProvider>
    </AuthProvider>
  )
}
