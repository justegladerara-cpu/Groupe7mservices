import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { formatDate, formatFcfa, nomPeriode, nomPeriodeCourt, periodeDe } from '../lib/regles.js'
import { EnteteXp, Tuile, pluriel } from '../dream/communs.jsx'
import { BoutonDocument, Erreur, Icone, Vide, iconePoste } from '../ui/kit.jsx'
import { MODES } from './NouvelleDepense.jsx'

export default function Depenses({ donnees, periode, estGerant, peutEcrire, recharger, filtrePoste, setFiltrePoste, choixMois, ouvrirSaisie }) {
  const [erreur, setErreur] = useState('')
  const parId = Object.fromEntries(donnees.postes.map((p) => [p.id, p]))
  const lignes = donnees.depenses
    .filter((d) => periodeDe(d.date_paiement) === periode)
    .filter((d) => !filtrePoste || d.poste_id === filtrePoste)
  const total = lignes.reduce((s, d) => s + Number(d.montant), 0)
  const sansRecu = lignes.filter((d) => !d.recu_path).length
  const plusGrosse = lignes.reduce((m, d) => (!m || Number(d.montant) > Number(m.montant) ? d : m), null)

  async function supprimer(d) {
    if (!window.confirm(`Supprimer la dépense « ${parId[d.poste_id]?.nom} » de ${formatFcfa(d.montant)} ?`)) return
    try {
      await api.supprimerDepense(d.id)
      recharger()
    } catch (e) {
      setErreur(traduireErreur(e))
    }
  }

  return (
    <>
      <EnteteXp surtitre="Argent" titre="Dépenses" sousTitre="Chaque sortie d'argent, avec la preuve du paiement.">
        <select className="g7-filtre" aria-label="Filtrer par poste" value={filtrePoste} onChange={(e) => setFiltrePoste(e.target.value)}>
          <option value="">Tous les postes</option>
          {donnees.postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        {choixMois}
      </EnteteXp>

      <div className="xp-grille">
        <Tuile titre={filtrePoste ? `Total « ${parId[filtrePoste]?.nom} »` : `Total de ${nomPeriodeCourt(periode)}`} icone="depenses"
          valeur={formatFcfa(total)} pourquoi={pluriel(lignes.length, 'dépense', 'dépenses')} />
        <Tuile titre="Sans reçu" icone="trombone" valeur={String(sansRecu)}
          verdict={sansRecu ? { ton: 'vigilance', texte: 'À compléter' } : lignes.length ? { ton: 'bon', texte: 'Complet' } : null}
          pourquoi={sansRecu ? 'Gardez une preuve de chaque paiement : photo du reçu ou de la facture.' : 'Chaque dépense a sa preuve.'} />
        {plusGrosse && (
          <Tuile titre="Plus grosse dépense" icone="graphique" valeur={formatFcfa(plusGrosse.montant)}
            pourquoi={`${parId[plusGrosse.poste_id]?.nom}, payée le ${formatDate(plusGrosse.date_paiement)}.`} />
        )}
      </div>

      <Erreur message={erreur} />
      {lignes.length === 0 ? (
        <Vide titre={`Aucune dépense en ${nomPeriode(periode)}${filtrePoste ? ' pour ce poste' : ''}.`}
          action={peutEcrire && <button className="bouton principal" onClick={() => ouvrirSaisie({ poste_id: filtrePoste || undefined })}><Icone nom="plus" taille={16} />Nouvelle dépense</button>} />
      ) : (
        <div className="xp-liste">
          {lignes.map((d) => {
            const p = parId[d.poste_id]
            return (
              <div key={d.id} className="xp-ligne">
                <span className="g7-puce-icone"><Icone nom={iconePoste(p)} taille={16} /></span>
                <div className="xp-ligne-texte">
                  <strong>{p?.nom}{d.periode !== periodeDe(d.date_paiement) && <span className="texte-doux"> · pour {nomPeriode(d.periode)}</span>}</strong>
                  <small>{formatDate(d.date_paiement)} · {MODES[d.mode_paiement]}{d.beneficiaire ? ` · ${d.beneficiaire}` : ''}{d.note ? ` · ${d.note}` : ''}</small>
                  <span className="g7-actions">
                    {d.recu_path ? <BoutonDocument chemin={d.recu_path} texte="Voir le reçu" /> : <span className="xp-verdict vigilance">Sans reçu</span>}
                    {estGerant && <button className="lien danger" onClick={() => supprimer(d)}>Supprimer</button>}
                  </span>
                </div>
                <span className="xp-ligne-valeur">{formatFcfa(d.montant)}</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
