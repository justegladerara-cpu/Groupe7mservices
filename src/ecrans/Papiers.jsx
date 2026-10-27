import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { etatAutorisation, formatDate, phraseAutorisation } from '../lib/regles.js'
import { BoutonDocument, Champ, ChampDocument, Fenetre, Pastille, Vide } from '../ui/kit.jsx'

const LIBELLES = { expiree: 'Expiré', bientot: 'Bientôt', valide: 'Valide', permanente: 'Valide', a_completer: 'À compléter' }
const ORDRE = { expiree: 0, bientot: 1, a_completer: 2, valide: 3, permanente: 4 }

export default function Papiers({ donnees, peutEcrire, estGerant, recharger }) {
  const [ouvert, setOuvert] = useState(null)
  const liste = donnees.autorisations
    .map((a) => ({ ...a, etat: etatAutorisation(a) }))
    .sort((a, b) => ORDRE[a.etat] - ORDRE[b.etat] || (a.date_fin || '9').localeCompare(b.date_fin || '9'))
  const compte = (e) => liste.filter((a) => a.etat === e).length

  return (
    <div className="pile">
      <section className="grille-chiffres">
        <div className={`chiffre ${compte('expiree') ? 'chiffre-rouge' : 'chiffre-vert'}`}>
          <div className="chiffre-titre">Expirés</div>
          <div className="chiffre-valeur">{compte('expiree')}</div>
          <div className="chiffre-detail">{compte('expiree') ? 'Un client peut les demander à tout moment.' : 'Aucun.'}</div>
        </div>
        <div className={`chiffre ${compte('bientot') ? 'chiffre-orange' : ''}`}>
          <div className="chiffre-titre">À renouveler bientôt</div>
          <div className="chiffre-valeur">{compte('bientot')}</div>
          <div className="chiffre-detail">Moins de 60 jours (réglable par papier)</div>
        </div>
        <div className="chiffre">
          <div className="chiffre-titre">À compléter</div>
          <div className="chiffre-valeur">{compte('a_completer')}</div>
          <div className="chiffre-detail">Dates ou document manquants</div>
        </div>
      </section>

      {peutEcrire && <button className="bouton bouton-secondaire" onClick={() => setOuvert({})}>+ Ajouter un papier</button>}

      {liste.length === 0 ? <Vide>Aucun papier enregistré.</Vide> : (
        <div className="grille-postes">
          {liste.map((a) => (
            <button key={a.id} className={`tuile-poste bord-${a.etat}`} onClick={() => setOuvert(a)}>
              <div className="tuile-tete">
                <span className="tuile-nom">{a.nom}</span>
                <Pastille etat={a.etat} texte={LIBELLES[a.etat]} />
              </div>
              <div className="petit texte-doux">{[a.organisme, a.numero].filter(Boolean).join(' · ') || '—'}</div>
              <div className="tuile-conseil">{phraseAutorisation(a)}</div>
              {a.date_fin && <div className="petit">Jusqu'au {formatDate(a.date_fin)}</div>}
              {a.document_path ? <div className="petit texte-vert">📎 Document enregistré</div> : <div className="petit texte-orange">Pas de copie enregistrée</div>}
            </button>
          ))}
        </div>
      )}

      {ouvert && (
        <FichePapier a={ouvert} peutEcrire={peutEcrire} estGerant={estGerant}
          fermer={() => setOuvert(null)} enregistre={() => { setOuvert(null); recharger() }} />
      )}
    </div>
  )
}

function FichePapier({ a, peutEcrire, estGerant, fermer, enregistre }) {
  const [f, setF] = useState({
    nom: a.nom || '', numero: a.numero || '', organisme: a.organisme || '',
    date_debut: a.date_debut || '', date_fin: a.date_fin || '', rappel_jours: a.rappel_jours ?? 60, note: a.note || '',
  })
  const [fichier, setFichier] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const maj = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enregistrer() {
    if (!f.nom.trim()) return setErreur('Donnez un nom au papier.')
    if (f.date_debut && f.date_fin && f.date_fin < f.date_debut) return setErreur('La date de fin est avant la date de début.')
    setEnvoi(true)
    setErreur('')
    try {
      const document_path = fichier ? await api.envoyerDocument('autorisations', fichier) : a.document_path || null
      await api.enregistrerAutorisation({
        ...(a.id ? { id: a.id } : {}),
        nom: f.nom.trim(), numero: f.numero || null, organisme: f.organisme || null,
        date_debut: f.date_debut || null, date_fin: f.date_fin || null,
        rappel_jours: Number(f.rappel_jours) || 0, note: f.note || null, document_path,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer « ${a.nom} » de la liste ?`)) return
    try {
      await api.supprimerAutorisation(a.id)
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
    }
  }

  return (
    <Fenetre
      titre={a.id ? a.nom : 'Nouveau papier'}
      fermer={fermer}
      pied={peutEcrire && (
        <>
          {estGerant && a.id && <button className="bouton bouton-danger" onClick={supprimer} disabled={envoi}>Supprimer</button>}
          <button className="bouton" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      <fieldset disabled={!peutEcrire}>
        <Champ label="Nom"><input value={f.nom} onChange={maj('nom')} placeholder="Ex. : Agrément du ministère du Travail" /></Champ>
        <div className="deux-colonnes">
          <Champ label="Numéro"><input value={f.numero} onChange={maj('numero')} /></Champ>
          <Champ label="Délivré par"><input value={f.organisme} onChange={maj('organisme')} /></Champ>
        </div>
        <div className="deux-colonnes">
          <Champ label="Valable du"><input type="date" value={f.date_debut} onChange={maj('date_debut')} /></Champ>
          <Champ label="Jusqu'au" aide="Laisser vide s'il n'expire pas."><input type="date" value={f.date_fin} onChange={maj('date_fin')} /></Champ>
        </div>
        <Champ label="Prévenir combien de jours avant ?">
          <input inputMode="numeric" value={f.rappel_jours} onChange={(e) => setF({ ...f, rappel_jours: e.target.value.replace(/\D/g, '') })} />
        </Champ>
        <Champ label="Copie du papier"><ChampDocument fichier={fichier} setFichier={setFichier} cheminExistant={a.document_path} /></Champ>
        <Champ label="Note"><input value={f.note} onChange={maj('note')} /></Champ>
      </fieldset>
      {!peutEcrire && <BoutonDocument chemin={a.document_path} />}
      {erreur && <p className="texte-erreur">{erreur}</p>}
    </Fenetre>
  )
}
