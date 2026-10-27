import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { traduireErreur } from '../lib/api.js'
import { DOMAINE_IDENTIFIANTS, emailDeConnexion } from '../lib/regles.js'
import { Champ, Erreur } from '../ui/kit.jsx'

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
      const { error } = await supabase.auth.signInWithPassword({ email: emailDeConnexion(email), password: motDePasse })
      if (error) throw error
    })
  }

  const oublie = () => agir(async () => {
    if (!email.trim()) throw new Error("Écrivez d'abord votre identifiant ou votre e-mail.")
    const adresse = emailDeConnexion(email)
    if (adresse.endsWith(`@${DOMAINE_IDENTIFIANTS}`)) {
      throw new Error('Pour un identifiant, contactez Agence Elite qui remettra un mot de passe provisoire.')
    }
    const { error } = await supabase.auth.resetPasswordForEmail(adresse, { redirectTo: window.location.origin + window.location.pathname })
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
    <CadreAuth>
      <form className="connexion-carte" onSubmit={recuperation ? nouveau : seConnecter}>
        <div className="marque">
          <span className="marque-logo g7">G7M</span>
          <span className="marque-texte"><strong>Groupe7M services</strong><small>Tableau de bord</small></span>
        </div>
        <div>
          <h1>{recuperation ? 'Nouveau mot de passe' : 'Bienvenue'}</h1>
          <p className="texte-doux">{recuperation ? 'Choisissez un mot de passe d’au moins 8 caractères.' : 'Connectez-vous pour voir où va l’argent de la société.'}</p>
        </div>
        {recuperation ? (
          <Champ libelle="Nouveau mot de passe">
            <input type="password" autoComplete="new-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoFocus />
          </Champ>
        ) : (
          <>
            <Champ libelle="Identifiant">
              <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Champ>
            <Champ libelle="Mot de passe">
              <input type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
            </Champ>
          </>
        )}
        <Erreur message={erreur} />
        {message && <p className="texte-ok">{message}</p>}
        <button className="bouton principal grand" disabled={envoi}>{envoi ? 'Patientez…' : recuperation ? 'Enregistrer' : 'Se connecter'}</button>
        {!recuperation && (
          <div className="auth-pied">
            <button type="button" className="lien" onClick={oublie} disabled={envoi}>Mot de passe oublié ?</button>
          </div>
        )}
      </form>
    </CadreAuth>
  )
}

// Fond et centrage des écrans de connexion, comme The Dream.
export function CadreAuth({ children }) {
  return (
    <div className="connexion auth auth-fond-degrade">
      <div className="auth-grille">
        <div className="auth-zone">{children}</div>
      </div>
    </div>
  )
}
