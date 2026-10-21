import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/AppShell'
import { StoreProvider } from '@/lib/data/store'

export const metadata: Metadata = {
  title: 'AutoCarnet — Gestion automobile & rapport de vente PDF',
  description:
    "Application open source de gestion automobile : carnet d'entretien, pannes, dépenses, justificatifs et rapport de vente PDF professionnel.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  )
}
