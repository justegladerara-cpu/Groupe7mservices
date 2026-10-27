import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { etatAutorisation, formatDate, phraseAutorisation } from '../lib/regles.js'
import { EnteteXp, Tuile, pluriel } from '../dream/communs.jsx'
import { BoutonDocument, Champ, ChampDocument, Erreur, Icone, Modale, Vide, tonDe } from '../ui/kit.jsx'

const LIBELLES = { expiree: 'Expiré', bientot: 'Bientôt', valide: 'Valide', permanente: 'Valide', a_completer: 'À compléter' }
const ORDRE = { expiree: 0, bientot: 1, a_completer: 2, valide: 3, permanente: 4 }

export default function Papiers({ donnees, peutEcrire, estGerant, recharger }) {
  const [ouvert, setOuvert] = useState(null)
  const liste = donnees.autorisations
    .map((a) => ({ ...a, etat: etatAutorisation(a) }))
    .sort((a, b) => ORDRE[a.etat] - ORDRE[b.etat] || (a.date_fin || '9').localeCompare(b.date_fin || '9'))
  const compte = (e) => liste.filter((a) => a.etat === e).length

  return (
    <>
      <EnteteXp surtitre="Obligations" titre="Papiers et autorisations" sousTitre="Agrément, assurances, attestations : chaque papier avec sa date de fin, pour le renouveler à temps.">
        {peutEcrire && <button className="bouton principal" onClick={() => setOuvert({})}><Icone nom="plus" taille={16} />Ajouter un papier</button>}
      </EnteteXp>

      <div className="xp-grille">
        <Tuile titre="Expirés" icone="alerte" valeur={String(compte('expiree'))}
          verdict={compte('expiree') ? { ton: 'mauvais', texte: 'À renouveler' } : { ton: 'bon', texte: 'Aucun' }}
          pourquoi={compte('expiree') ? 'Un client ou un contrôle peut les demander à tout moment.' : 'Aucun papier expiré.'} />
        <Tuile titre="À renouveler bientôt" icone="horloge" valeur={String(compte('bientot'))}
          verdict={compte('bientot') ? { ton: 'vigilance', texte: 'Bientôt' } : null}
          pourquoi="Moins de 60 jours avant la fin (réglable par papier)." />
        <Tuile titre="À compléter" icone="document" valeur={String(compte('a_completer'))}
          pourquoi="Dates ou copie du document manquantes." />
      </div>

      {liste.length === 0 ? <Vide titre="Aucun papier enregistré." /> : (
        <section className="xp-section">
          <h2 className="xp-section-titre">Tous les papiers <small>{pluriel(liste.length, 'papier', 'papiers')}</small></h2>
          <div className="xp-grille large">
            {liste.map((a) => (
              <Tuile key={a.id} className={`ton-${tonDe(a.etat)}`} titre={a.nom} icone="dossier"
                verdict={{ ton: tonDe(a.etat), texte: LIBELLES[a.etat] }}
                valeur={a.date_fin ? formatDate(a.date_fin) : null}
                pourquoi={phraseAutorisation(a)}
                conseil={peutEcrire ? 'Ouvrir la fiche' : 'Voir'}
                onClick={() => setOuvert(a)}>
                <span className="g7-detail">{[a.organisme, a.numero].filter(Boolean).join(' · ') || 'Organisme et numéro à compléter'}</span>
                {a.document_path
                  ? <span className="g7-detail bon">Copie enregistrée</span>
                  : <span className="g7-detail vigilance">Pas de copie enregistrée</span>}
              </Tuile>
            ))}
          </div>
        </section>
      )}

      {ouvert && (
        <FichePapier a={ouvert} peutEcrire={peutEcrire} estGerant={estGerant}
          fermer={() => setOuvert(null)} enregistre={() => { setOuvert(null); recharger() }} />
      )}
    </>
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
    <Modale
      titre={a.id ? a.nom : 'Nouveau papier'}
      fermer={fermer}
      pied={peutEcrire && (
        <>
          {estGerant && a.id && <button className="bouton danger" onClick={supprimer} disabled={envoi}>Supprimer</button>}
          <button className="bouton principal" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      <fieldset className="g7-champs" disabled={!peutEcrire}>
        <Champ libelle="Nom"><input value={f.nom} onChange={maj('nom')} placeholder="Ex. : Agrément du ministère du Travail" /></Champ>
        <div className="g7-deux">
          <Champ libelle="Numéro"><input value={f.numero} onChange={maj('numero')} /></Champ>
          <Champ libelle="Délivré par"><input value={f.organisme} onChange={maj('organisme')} /></Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Valable du"><input type="date" value={f.date_debut} onChange={maj('date_debut')} /></Champ>
          <Champ libelle="Jusqu'au" aide="Laisser vide s'il n'expire pas."><input type="date" value={f.date_fin} onChange={maj('date_fin')} /></Champ>
        </div>
        <Champ libelle="Prévenir combien de jours avant ?">
          <input inputMode="numeric" value={f.rappel_jours} onChange={(e) => setF({ ...f, rappel_jours: e.target.value.replace(/\D/g, '') })} />
        </Champ>
        <Champ libelle="Copie du papier"><ChampDocument fichier={fichier} setFichier={setFichier} cheminExistant={a.document_path} /></Champ>
        <Champ libelle="Note"><input value={f.note} onChange={maj('note')} /></Champ>
      </fieldset>
      {!peutEcrire && <BoutonDocument chemin={a.document_path} />}
      <Erreur message={erreur} />
    </Modale>
  )
}
