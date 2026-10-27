import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { formatDate, formatFcfa, nomPeriode, nomPeriodeCourt, periodeDe } from '../lib/regles.js'
import { BoutonDocument, Vide } from '../ui/kit.jsx'
import { MODES } from './NouvelleDepense.jsx'

export default function Depenses({ donnees, periode, estGerant, recharger, filtrePoste, setFiltrePoste }) {
  const [erreur, setErreur] = useState('')
  const parId = Object.fromEntries(donnees.postes.map((p) => [p.id, p]))
  const lignes = donnees.depenses
    .filter((d) => periodeDe(d.date_paiement) === periode)
    .filter((d) => !filtrePoste || d.poste_id === filtrePoste)
  const total = lignes.reduce((s, d) => s + Number(d.montant), 0)
  const sansRecu = lignes.filter((d) => !d.recu_path).length

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
    <div className="pile">
      <div className="carte carte-ligne">
        <div>
          <div className="chiffre-titre">Total {filtrePoste ? `« ${parId[filtrePoste]?.nom} »` : 'des dépenses'} en {nomPeriodeCourt(periode)}</div>
          <div className="chiffre-valeur">{formatFcfa(total)}</div>
          {sansRecu > 0 && <div className="texte-orange">{sansRecu} dépense(s) sans reçu : pensez à garder une preuve.</div>}
        </div>
        <select aria-label="Filtrer par poste" value={filtrePoste} onChange={(e) => setFiltrePoste(e.target.value)}>
          <option value="">Tous les postes</option>
          {donnees.postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
      </div>
      {erreur && <p className="texte-erreur">{erreur}</p>}
      {lignes.length === 0 ? <Vide>Aucune dépense en {nomPeriode(periode)}{filtrePoste ? ' pour ce poste' : ''}.</Vide> : (
        <ul className="liste carte">
          {lignes.map((d) => {
            const p = parId[d.poste_id]
            return (
              <li key={d.id} className="ligne-depense">
                <span className="ligne-icone" aria-hidden>{p?.icone}</span>
                <div className="ligne-milieu">
                  <div className="ligne-titre">{p?.nom}{d.periode !== periodeDe(d.date_paiement) && <span className="texte-doux"> · pour {nomPeriode(d.periode)}</span>}</div>
                  <div className="ligne-sous">
                    {formatDate(d.date_paiement)} · {MODES[d.mode_paiement]}{d.beneficiaire ? ` · ${d.beneficiaire}` : ''}{d.note ? ` · ${d.note}` : ''}
                  </div>
                  <div className="ligne-actions">
                    {d.recu_path ? <BoutonDocument chemin={d.recu_path} texte="Reçu" /> : <span className="texte-orange petit">Sans reçu</span>}
                    {estGerant && <button className="lien lien-rouge" onClick={() => supprimer(d)}>Supprimer</button>}
                  </div>
                </div>
                <div className="ligne-montant">{formatFcfa(d.montant)}</div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
