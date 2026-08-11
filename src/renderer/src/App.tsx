import { useEffect, useState } from 'react'

/**
 * Scaffold placeholder. The real config / timer / complete views and the
 * theme system are implemented in later plan steps (see .helm-goal/plan.md).
 * This just proves the Electron + React + preload bridge is wired up and the
 * app launches.
 */
export default function App(): JSX.Element {
  const [bridge, setBridge] = useState<string>('…')

  useEffect(() => {
    try {
      setBridge(window.pompom?.ping?.() ?? 'unavailable')
    } catch {
      setBridge('unavailable')
    }
  }, [])

  return (
    <div className="scaffold">
      <div className="scaffold-card">
        <h1>PomPom</h1>
        <p>Electron + React scaffold is running.</p>
        <p className="dim">preload bridge: {bridge}</p>
      </div>
    </div>
  )
}
