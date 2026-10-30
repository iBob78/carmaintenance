import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/carburant' }))
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', { href, ...props }, children) }))
vi.mock('@/components/ThemeToggle', () => ({ ThemeToggle: () => null }))
vi.mock('@/lib/data/store', () => ({ useStore: () => ({ ready: true, mode: 'demo' }) }))

import { AppShell } from '@/components/AppShell'
import { Button, Input, Modal, Tabs } from '@/components/ui'

describe('interface mobile', () => {
  it('propose une navigation mobile accessible vers les rubriques principales', () => {
    const html = renderToStaticMarkup(React.createElement(AppShell, null, 'Contenu'))
    expect(html).toContain('aria-label="Navigation mobile"')
    expect(html).toContain('href="/carburant" aria-current="page"')
    expect(html).toContain('aria-label="Plus de rubriques"')
    expect(html).toContain('env(safe-area-inset-bottom)')
  })
  it('adapte les contrôles et la modale aux écrans tactiles', () => {
    const html = renderToStaticMarkup(React.createElement('div', null,
      React.createElement(Button, null, 'Valider'),
      React.createElement(Input, { value: '', readOnly: true }),
      React.createElement(Modal, { open: true, onClose: () => {}, title: 'Formulaire', children: 'Contenu' }),
      React.createElement(Tabs, { tabs: [{ id: 'a', label: 'Résumé' }], active: 'a', onChange: () => {} }),
    ))
    expect(html).toContain('min-h-11')
    expect(html).toContain('text-base')
    expect(html).toContain('92dvh')
    expect(html).toContain('aria-pressed="true"')
  })
})
