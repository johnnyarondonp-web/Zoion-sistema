import React from 'react'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './app.css'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true }) as Record<string, any>
    const page = pages[`./pages/${name}.tsx`]
    if (!page) throw new Error(`Page not found: ${name}`)
    return page
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <App {...props} />
      </ThemeProvider>
    )
  },
})