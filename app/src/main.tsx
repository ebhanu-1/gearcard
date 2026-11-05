import { render } from 'preact'
import './styles/app.css'
import { App } from './App'
import { bodies, lensById } from './lib/data'
import { applyTheme, sanitize } from './lib/state'

sanitize((id) => !!lensById(id), (id) => bodies.some((b) => b.id === id))
applyTheme()
render(<App />, document.getElementById('app')!)
