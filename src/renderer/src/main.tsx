import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import TakeoverView from './views/TakeoverView'
import AmbientView from './views/AmbientView'
import MiniView from './views/MiniView'
import './themes/themes.css'
import './styles/global.css'
import './styles/views.css'

// A single renderer bundle serves every window; the URL hash selects the role
// (`#/` main, `#/takeover`, `#/ambient`, `#/mini`). The main process loads each
// aux window with the corresponding hash (see src/main/index.ts).
const route = window.location.hash.replace(/^#\/?/, '')

let element: JSX.Element
if (route.startsWith('takeover')) {
  document.body.classList.add('body-fullbleed')
  element = <TakeoverView />
} else if (route.startsWith('ambient')) {
  document.body.classList.add('body-ambient')
  element = <AmbientView />
} else if (route.startsWith('mini')) {
  document.body.classList.add('body-mini')
  element = <MiniView />
} else {
  element = <App />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{element}</React.StrictMode>
)
