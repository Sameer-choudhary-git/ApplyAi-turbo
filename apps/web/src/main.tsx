import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'

// Force dark mode globally
document.documentElement.classList.add('dark')

// The '!' tells TypeScript that this element will definitely not be null
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)