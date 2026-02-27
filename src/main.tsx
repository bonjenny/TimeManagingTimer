import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { CssBaseline } from '@mui/material'
import { initStorage } from './utils/storage'

initStorage()
  .then(() => new Promise<void>(resolve => setTimeout(resolve, 0)))
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <CssBaseline />
        <App />
      </React.StrictMode>,
    )
  })
