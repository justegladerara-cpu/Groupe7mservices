// Composants communs, avec les mêmes classes que The Dream (saas.agence-elite.fr).
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api, traduireErreur } from '../lib/api.js'
import { Icone } from '../dream/Icone.jsx'

export { Icone }

// Ton The Dream d'un état : bon (vert), vigilance (ambre), mauvais (rouge), neutre (or discret).
const TON = {
  payee: 'bon', paye: 'bon', valide: 'bon', permanente: 'bon',
  partiel: 'vigilance', bientot: 'vigilance', declare: 'vigilance', a_declarer: 'vigilance',
  en_retard: 'mauvais', expiree: 'mauvais',
  a_venir: 'neutre', a_completer: 'neutre', pas_encore: 'neutre',
}
export const tonDe = (etat) => TON[etat] || 'neutre'

const LIBELLES = {
  payee: 'Payé', partiel: 'Payé en partie', en_retard: 'En retard', bientot: 'Bientôt dû', a_venir: 'À venir',
}

export function Pastille({ etat, texte }) {
  return <span className={`xp-verdict ${tonDe(etat)}`}>{texte || LIBELLES[etat] || etat}</span>
}

export function Modale({ titre, fermer, children, pied, large }) {
  const dialogue = useRef(null)
  const refFermer = useRef(fermer)
  useEffect(() => { refFermer.current = fermer })
  useEffect(() => {
    const avant = document.activeElement
    dialogue.current?.querySelector('input, select, textarea, button')?.focus()
    const touche = (e) => e.key === 'Escape' && refFermer.current?.()
    window.addEventListener('keydown', touche)
    return () => { window.removeEventListener('keydown', touche); avant?.focus?.() }
  }, [])
  return createPortal(
    <div className="voile" onMouseDown={(e) => e.target === e.currentTarget && fermer?.()}>
      <div ref={dialogue} className={`modale ${large ? 'large' : ''}`} role="dialog" aria-modal="true" aria-label={titre}>
        <header>
          <h2>{titre}</h2>
          <button className="icone-bouton" onClick={fermer} aria-label="Fermer"><Icone nom="fermer" /></button>
        </header>
        <div className="modale-corps">{children}</div>
        {pied && <footer>{pied}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function Champ({ libelle, aide, children, className = '' }) {
  return (
    <label className={`champ ${className}`.trim()}>
      <span className="champ-libelle">{libelle}</span>
      {children}
      {aide && <small className="champ-aide">{aide}</small>}
    </label>
  )
}

// Saisie d'un montant en FCFA avec séparateur de milliers.
export function ChampMontant({ valeur, onChange, autoFocus, grand }) {
  const affiche = valeur === '' || valeur === null || valeur === undefined ? '' : Number(valeur).toLocaleString('fr-FR').replace(/ | /g, ' ')
  return (
    <div className={`g7-montant ${grand ? 'grand' : ''}`}>
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

// Photo du reçu ou PDF (le téléphone propose l'appareil photo ou ses fichiers).
export function ChampDocument({ fichier, setFichier, cheminExistant, libelle = 'Photo ou PDF' }) {
  return (
    <div className="article-photo g7-document">
      <label className="bouton secondaire">
        <Icone nom="photo" taille={16} />
        <span>{fichier ? 'Changer' : cheminExistant ? 'Remplacer le document' : libelle}</span>
        <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFichier(e.target.files?.[0] || null)} />
      </label>
      {fichier && <small className="texte-doux">{fichier.name}</small>}
      {!fichier && cheminExistant && <BoutonDocument chemin={cheminExistant} />}
    </div>
  )
}

export function BoutonDocument({ chemin, texte = 'Voir le document' }) {
  const [erreur, setErreur] = useState('')
  if (!chemin) return null
  return (
    <>
      <button type="button" className="lien" onClick={(e) => { e.stopPropagation(); api.ouvrirDocument(chemin).catch((x) => setErreur(traduireErreur(x))) }}>
        {texte}
      </button>
      {erreur && <small className="texte-erreur"> {erreur}</small>}
    </>
  )
}

export function Vide({ titre, texte, action }) {
  return (
    <div className="vide">
      <strong>{titre}</strong>
      {texte && <p>{texte}</p>}
      {action}
    </div>
  )
}

export function Chargement({ texte = 'Chargement…' }) {
  return <div className="chargement" role="status"><span className="rouet" />{texte}</div>
}

export function Erreur({ message, action }) {
  if (!message) return null
  return (
    <div className="erreur" role="alert">
      <Icone nom="alerte" taille={16} />
      <span>{message}</span>
      {action}
    </div>
  )
}

export function Avatar({ nom }) {
  const lettres = String(nom ?? '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?'
  return <span className="avatar petit" aria-hidden="true">{lettres}</span>
}

// Icône d'un poste de dépense (tracés The Dream).
const ICONE_POSTE = {
  'Salaires des agents': 'membres', 'Avances sur salaire': 'billet', CNSS: 'badge', TUS: 'document', 'IRPP retenu': 'facture',
  TOL: 'document', 'Patente et autres impôts': 'document', Loyer: 'depot', 'Électricité': 'activite', Eau: 'repeter',
  Internet: 'globe', 'Téléphone et crédit': 'telephone', 'Fournitures de bureau': 'trombone', Assurances: 'cle',
  'Transport et carburant': 'camion', 'Équipements de sécurité': 'badge', 'Frais bancaires': 'carte', 'Autres dépenses': 'depenses',
}
const ICONE_GROUPE = { agents: 'membres', etat: 'document', bureau: 'depot', terrain: 'camion', protection: 'cle', autre: 'depenses' }
export const iconePoste = (p) => ICONE_POSTE[p?.nom] || ICONE_GROUPE[p?.groupe] || 'depenses'
