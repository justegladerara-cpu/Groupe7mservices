import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { traduireErreur } from '../lib/api.js'

export default function Connexion({ recuperation, finRecuperation }) {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function agir(fn) {
    setEnvoi(true)
    setErreur('')
    setMessage('')
    try {
      await fn()
    } catch (e) {
      setErreur(traduireErreur(e))
    }
    setEnvoi(false)
  }

  const seConnecter = (e) => {
    e.preventDefault()
    agir(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
      if (error) throw error
    })
  }

  const oublie = () => agir(async () => {
    if (!email.trim()) throw new Error("Écrivez d'abord votre e-mail.")
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    if (error) throw error
    setMessage('Un e-mail vous a été envoyé pour choisir un nouveau mot de passe.')
  })

  const nouveau = (e) => {
    e.preventDefault()
    agir(async () => {
      if (motDePasse.length < 8) throw new Error('Au moins 8 caractères.')
      const { error } = await supabase.auth.updateUser({ password: motDePasse })
      if (error) throw error
      finRecuperation()
    })
  }

  return (
    <div className="page-centre">
      <form className="carte carte-etroite" onSubmit={recuperation ? nouveau : seConnecter}>
        <div className="marque marque-centre">
          <span className="logo">G7M</span>
          <div>
            <div className="marque-nom">Groupe7M services</div>
            <div className="marque-sous">Tableau de bord</div>
          </div>
        </div>
        {recuperation ? (
          <label className="champ">
            <span className="champ-label">Nouveau mot de passe</span>
            <input type="password" autoComplete="new-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoFocus />
          </label>
        ) : (
          <>
            <label className="champ">
              <span className="champ-label">E-mail</span>
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </label>
            <label className="champ">
              <span className="champ-label">Mot de passe</span>
              <input type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
            </label>
          </>
        )}
        {erreur && <p className="texte-erreur">{erreur}</p>}
        {message && <p className="texte-vert">{message}</p>}
        <button className="bouton bouton-large" disabled={envoi}>{envoi ? 'Patientez…' : recuperation ? 'Enregistrer' : 'Se connecter'}</button>
        {!recuperation && <button type="button" className="lien" onClick={oublie} disabled={envoi}>Mot de passe oublié ?</button>}
      </form>
    </div>
  )
}
