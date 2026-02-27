import { initStorage } from './utils/storage'

initStorage()
  .then(async () => {
    const { default: React } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { CssBaseline } = await import('@mui/material')
    const { default: App } = await import('./App')

    createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <CssBaseline />
        <App />
      </React.StrictMode>,
    )
  })
  .catch((err) => {
    console.error('Storage initialization failed:', err)
  })
