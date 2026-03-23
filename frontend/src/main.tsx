import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // './App.tsx' 라고 쓰지 않아도 됩니다.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
