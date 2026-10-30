import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/AppShell'
import { StoreProvider } from '@/lib/data/store'

export const metadata: Metadata = {
  title: 'AutoCarnet — Gestion automobile & rapport de vente PDF',
  description:
    "Application open source de gestion automobile : carnet d'entretien, pannes, dépenses, justificatifs et rapport de vente PDF professionnel.",
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        {/* Applique le thème avant hydratation : aucun clignotement de la page */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('autocarnet-theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();",
          }}
        />
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  )
}
