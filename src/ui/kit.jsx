import { useEffect, useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { LIBELLE_ETAT } from '../lib/regles.js'

const COULEUR_ETAT = {
  payee: 'vert', paye: 'vert', valide: 'vert', permanente: 'vert',
  partiel: 'orange', bientot: 'orange', declare: 'orange', a_declarer: 'orange',
  en_retard: 'rouge', expiree: 'rouge',
  a_venir: 'gris', a_completer: 'gris', pas_encore: 'gris',
}

export function Pastille({ etat, texte }) {
  return <span className={`pastille pastille-${COULEUR_ETAT[etat] || 'gris'}`}>{texte || LIBELLE_ETAT[etat] || etat}</span>
}

export function Fenetre({ titre, fermer, children, pied }) {
  useEffect(() => {
    const touche = (e) => e.key === 'Escape' && fermer()
    document.addEventListener('keydown', touche)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', touche); document.body.style.overflow = '' }
  }, [fermer])
  return (
    <div className="voile" onMouseDown={(e) => e.target === e.currentTarget && fermer()}>
      <div className="fenetre" role="dialog" aria-modal="true" aria-label={titre}>
        <div className="fenetre-tete">
          <h2>{titre}</h2>
          <button className="fermer" aria-label="Fermer" onClick={fermer}>×</button>
        </div>
        <div className="fenetre-corps">{children}</div>
        {pied && <div className="fenetre-pied">{pied}</div>}
      </div>
    </div>
  )
}

export function Champ({ label, aide, children }) {
  return (
    <label className="champ">
      <span className="champ-label">{label}</span>
      {children}
      {aide && <span className="champ-aide">{aide}</span>}
    </label>
  )
}

// Saisie d'un montant en FCFA avec séparateur de milliers.
export function ChampMontant({ valeur, onChange, autoFocus, grand }) {
  const affiche = valeur === '' || valeur === null || valeur === undefined ? '' : Number(valeur).toLocaleString('fr-FR').replace(/ | /g, ' ')
  return (
    <div className={`montant-saisie ${grand ? 'grand' : ''}`}>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        value={affiche}
        placeholder="0"
        onChange={(e) => {
          const chiffres = e.target.value.replace(/\D/g, '')
          onChange(chiffres === '' ? '' : Number(chiffres))
        }}
      />
      <span>FCFA</span>
    </div>
  )
}

// Bouton pour joindre une photo ou un PDF.
export function ChampDocument({ fichier, setFichier, cheminExistant }) {
  return (
    <div className="document-saisie">
      <label className="bouton bouton-secondaire">
        📷 {fichier ? 'Changer' : cheminExistant ? 'Remplacer le document' : 'Photo ou PDF'}
        <input type="file" accept="image/*,application/pdf" hidden
          onChange={(e) => setFichier(e.target.files?.[0] || null)} />
      </label>
      {fichier && <span className="document-nom">{fichier.name}</span>}
      {!fichier && cheminExistant && <BoutonDocument chemin={cheminExistant} />}
    </div>
  )
}

export function BoutonDocument({ chemin, texte = 'Voir le document' }) {
  const [erreur, setErreur] = useState('')
  if (!chemin) return null
  return (
    <>
      <button type="button" className="lien" onClick={() => api.ouvrirDocument(chemin).catch((e) => setErreur(traduireErreur(e)))}>
        📎 {texte}
      </button>
      {erreur && <span className="texte-erreur"> {erreur}</span>}
    </>
  )
}

export function Vide({ children }) {
  return <div className="vide">{children}</div>
}
