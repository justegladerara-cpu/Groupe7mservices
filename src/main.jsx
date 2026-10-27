import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './dream/base.css'
import './dream/experience.css'
import './dream/g7.css'
import { POLICES_DEFAUT, appliquerAmbiance } from './dream/ambiance.js'

// Même ambiance que The Dream : noir et or, titres en Playfair Display, textes en Inter.
appliquerAmbiance({ theme: 'dream', mode: 'nuit', animations: true, polices: POLICES_DEFAUT, taille: 'normal' })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
