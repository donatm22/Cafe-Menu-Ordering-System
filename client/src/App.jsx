import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [apiState, setApiState] = useState({
    loading: true,
    ok: false,
    message: '',
    timestamp: '',
  })

  useEffect(() => {
    let ignore = false

    const loadHealth = async () => {
      try {
        const response = await fetch('/api/health')

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = await response.json()

        if (!ignore) {
          setApiState({
            loading: false,
            ok: true,
            message: data.message,
            timestamp: data.timestamp,
          })
        }
      } catch (error) {
        if (!ignore) {
          setApiState({
            loading: false,
            ok: false,
            message: error.message,
            timestamp: '',
          })
        }
      }
    }

    loadHealth()

    return () => {
      ignore = true
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">React + Node.js starter</p>
        <h1>Cafe is ready for full-stack work.</h1>
        <p className="intro">
          The frontend runs on React with Vite, and the backend runs on Node.js
          with Express. The card below is checking the API live.
        </p>

        <div className="status-card">
          <div>
            <p className="label">Backend status</p>
            <p className={`status ${apiState.ok ? 'online' : 'offline'}`}>
              {apiState.loading
                ? 'Checking connection...'
                : apiState.ok
                  ? 'Connected'
                  : 'Unavailable'}
            </p>
          </div>
          <p className="message">
            {apiState.loading
              ? 'Waiting for the Node server to answer.'
              : apiState.message}
          </p>
          <p className="timestamp">
            {apiState.timestamp
              ? `Last response: ${new Date(apiState.timestamp).toLocaleString()}`
              : 'Start the backend to see live API data here.'}
          </p>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <p className="label">Frontend</p>
          <h2>React + Vite</h2>
          <p>
            Source lives in <code>client/</code>. API requests to <code>/api</code>{' '}
            are proxied to the Node server during development.
          </p>
        </article>

        <article className="panel">
          <p className="label">Backend</p>
          <h2>Node + Express</h2>
          <p>
            Source lives in <code>server/</code>. The starter includes a health
            endpoint at <code>/api/health</code>.
          </p>
        </article>

        <article className="panel">
          <p className="label">Run commands</p>
          <h2>One command to start both</h2>
          <div className="command-list">
            <code>npm.cmd install</code>
            <code>npm.cmd --prefix client install</code>
            <code>npm.cmd --prefix server install</code>
            <code>npm.cmd run dev</code>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
