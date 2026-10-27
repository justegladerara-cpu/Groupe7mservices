import { useState } from 'react'
import { api, modeDemo, traduireErreur } from '../lib/api.js'
import { GROUPES, MOIS, formatFcfa, identifiantAffiche } from '../lib/regles.js'
import { supabase } from '../lib/supabase.js'
import { Champ, ChampMontant, Fenetre } from '../ui/kit.jsx'

const PERIODICITES = {
  mensuelle: 'Chaque mois',
  trimestrielle: 'Tous les 3 mois',
  semestrielle: 'Tous les 6 mois',
  annuelle: 'Une fois par an',
  ponctuelle: 'Quand il faut (pas de date fixe)',
}

function resumeEcheance(p) {
  if (p.periodicite === 'ponctuelle') return 'Pas de date fixe'
  const quand = p.decalage_mois ? `le ${p.jour_echeance} du mois suivant` : `le ${p.jour_echeance} du mois`
  const mois = ['annuelle', 'trimestrielle', 'semestrielle'].includes(p.periodicite) && p.mois_reference
    ? ` (à partir de ${MOIS[p.mois_reference - 1]})` : ''
  return `${PERIODICITES[p.periodicite]}, ${quand}${mois}`
}

export default function Reglages({ donnees, estGerant, recharger, email, membre }) {
  const [ouvert, setOuvert] = useState(null)
  return (
    <div className="pile">
      <section className="carte">
        <div className="titre-section">
          <h2>Postes de dépense</h2>
          {estGerant && <button className="bouton bouton-petit" onClick={() => setOuvert({})}>+ Nouveau poste</button>}
        </div>
        <p className="texte-doux petit">Indiquez le montant habituel et la date de paiement de chaque poste régulier : le tableau de bord saura alors ce qui reste à payer et préviendra avant chaque échéance.</p>
        <ul className="liste">
          {donnees.postes.map((p) => (
            <li key={p.id} className={`ligne-poste ${p.actif ? '' : 'inactif'}`}>
              <span className="ligne-icone" aria-hidden>{p.icone}</span>
              <div className="ligne-milieu">
                <div className="ligne-titre">{p.nom} {!p.actif && <span className="texte-doux">(arrêté)</span>}</div>
                <div className="ligne-sous">{GROUPES[p.groupe]?.nom} · {resumeEcheance(p)}</div>
              </div>
              <div className="ligne-montant">
                {p.montant_habituel ? formatFcfa(p.montant_habituel) : <span className="texte-doux">—</span>}
                {estGerant && <div><button className="lien" onClick={() => setOuvert(p)}>Modifier</button></div>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="carte">
        <h2>Mon compte</h2>
        <p>Identifiant : <b>{identifiantAffiche(email) === email ? email : membre.nom}</b> · {membre.role === 'gerant' ? 'Gérant (tous les droits)' : membre.role === 'saisie' ? 'Saisie des dépenses' : 'Lecture seule'}</p>
        {!modeDemo && <ChangerMotDePasse />}
        {!modeDemo && <p className="texte-doux petit">Pour ajouter une personne (comptable, secrétaire), demandez à Agence Elite : elle sera ajoutée avec le bon niveau d'accès.</p>}
      </section>

      {ouvert && <FichePoste p={ouvert} fermer={() => setOuvert(null)} enregistre={() => { setOuvert(null); recharger() }} />}
    </div>
  )
}

function FichePoste({ p, fermer, enregistre }) {
  const [f, setF] = useState({
    nom: p.nom || '', icone: p.icone || '•', groupe: p.groupe || 'autre', periodicite: p.periodicite || 'mensuelle',
    mois_reference: p.mois_reference || 1, jour_echeance: p.jour_echeance || 5, decalage_mois: p.decalage_mois || 0,
    montant_habituel: p.montant_habituel ?? '', beneficiaire: p.beneficiaire || '', actif: p.actif ?? true,
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const maj = (k, nombre) => (e) => setF({ ...f, [k]: nombre ? Number(e.target.value) : e.target.value })

  async function enregistrer() {
    if (!f.nom.trim()) return setErreur('Donnez un nom au poste.')
    setEnvoi(true)
    try {
      await api.enregistrerPoste({
        ...(p.id ? { id: p.id } : {}),
        ...f,
        nom: f.nom.trim(),
        mois_reference: f.periodicite === 'mensuelle' || f.periodicite === 'ponctuelle' ? null : f.mois_reference,
        montant_habituel: f.montant_habituel === '' ? null : f.montant_habituel,
        beneficiaire: f.beneficiaire || null,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  const regulier = f.periodicite !== 'ponctuelle'
  return (
    <Fenetre titre={p.id ? `Modifier « ${p.nom} »` : 'Nouveau poste'} fermer={fermer}
      pied={<button className="bouton" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>}>
      <div className="deux-colonnes colonnes-icone">
        <Champ label="Icône"><input value={f.icone} maxLength={4} onChange={maj('icone')} /></Champ>
        <Champ label="Nom"><input value={f.nom} onChange={maj('nom')} /></Champ>
      </div>
      <Champ label="Famille">
        <select value={f.groupe} onChange={maj('groupe')}>
          {Object.entries(GROUPES).map(([k, g]) => <option key={k} value={k}>{g.nom}</option>)}
        </select>
      </Champ>
      <Champ label="Montant habituel" aide="Sert à savoir ce qui reste à payer et à repérer une facture anormale.">
        <ChampMontant valeur={f.montant_habituel} onChange={(v) => setF({ ...f, montant_habituel: v })} />
      </Champ>
      <Champ label="Revient">
        <select value={f.periodicite} onChange={maj('periodicite')}>
          {Object.entries(PERIODICITES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Champ>
      {regulier && (
        <div className="deux-colonnes">
          <Champ label="À payer le (jour)">
            <input type="number" min="1" max="31" value={f.jour_echeance} onChange={maj('jour_echeance', true)} />
          </Champ>
          <Champ label="De quel mois ?">
            <select value={f.decalage_mois} onChange={maj('decalage_mois', true)}>
              <option value={0}>Le mois même</option>
              <option value={1}>Le mois suivant</option>
            </select>
          </Champ>
        </div>
      )}
      {regulier && f.periodicite !== 'mensuelle' && (
        <Champ label="Premier mois de paiement dans l'année">
          <select value={f.mois_reference} onChange={maj('mois_reference', true)}>
            {MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Champ>
      )}
      <Champ label="Payé à (habituellement)"><input value={f.beneficiaire} onChange={maj('beneficiaire')} /></Champ>
      <label className="case">
        <input type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Poste en cours d'utilisation
      </label>
      {erreur && <p className="texte-erreur">{erreur}</p>}
    </Fenetre>
  )
}

function ChangerMotDePasse() {
  const [ouvert, setOuvert] = useState(false)
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [etat, setEtat] = useState({ envoi: false, erreur: '', ok: '' })

  async function enregistrer(e) {
    e.preventDefault()
    if (nouveau.length < 8) return setEtat({ envoi: false, erreur: 'Au moins 8 caractères.', ok: '' })
    if (nouveau !== confirmation) return setEtat({ envoi: false, erreur: 'Les deux mots de passe ne sont pas identiques.', ok: '' })
    setEtat({ envoi: true, erreur: '', ok: '' })
    const { error } = await supabase.auth.updateUser({ password: nouveau })
    if (error) return setEtat({ envoi: false, erreur: traduireErreur(error), ok: '' })
    setNouveau('')
    setConfirmation('')
    setEtat({ envoi: false, erreur: '', ok: 'Mot de passe changé. Utilisez-le à la prochaine connexion.' })
    setOuvert(false)
  }

  if (!ouvert) {
    return (
      <>
        <button className="bouton bouton-secondaire" onClick={() => setOuvert(true)}>Changer mon mot de passe</button>
        {etat.ok && <p className="texte-vert">{etat.ok}</p>}
      </>
    )
  }
  return (
    <form className="pile-serree" onSubmit={enregistrer}>
      <Champ label="Nouveau mot de passe">
        <input type="password" autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoFocus />
      </Champ>
      <Champ label="Le retaper">
        <input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      </Champ>
      {etat.erreur && <p className="texte-erreur">{etat.erreur}</p>}
      <div className="rangee">
        <button type="button" className="bouton bouton-secondaire" onClick={() => setOuvert(false)} disabled={etat.envoi}>Annuler</button>
        <button className="bouton" disabled={etat.envoi}>{etat.envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}
