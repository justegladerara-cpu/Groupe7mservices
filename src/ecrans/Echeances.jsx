import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { formatDate, formatFcfa, joursAvant, nomPeriode } from '../lib/regles.js'
import { Pastille, Vide } from '../ui/kit.jsx'

function Ligne({ e, peutEcrire, estGerant, ouvrirSaisie, recharger, setErreur }) {
  const j = joursAvant(e.date_limite)
  const quand = e.etat === 'payee' ? `Payé ${formatFcfa(e.montantPaye)}`
    : j < 0 ? `Dû depuis ${-j} jour(s)` : j === 0 ? "Dû aujourd'hui" : `Dû dans ${j} jour(s)`

  async function changer(champs) {
    try {
      await api.modifierEcheance(e.id, champs)
      recharger()
    } catch (err) {
      setErreur(traduireErreur(err))
    }
  }

  function changerMontant() {
    const v = window.prompt(`Montant prévu pour ${e.poste.nom} (${nomPeriode(e.periode)}), en FCFA :`, e.montant_prevu ?? '')
    if (v === null) return
    const n = Number(String(v).replace(/\D/g, ''))
    changer({ montant_prevu: n || null })
  }

  return (
    <li className="ligne-echeance">
      <span className="ligne-icone" aria-hidden>{e.poste.icone}</span>
      <div className="ligne-milieu">
        <div className="ligne-titre">{e.poste.nom} <span className="texte-doux">· {nomPeriode(e.periode)}</span></div>
        <div className="ligne-sous">Limite : {formatDate(e.date_limite)} · {quand}</div>
        <div className="ligne-actions">
          <Pastille etat={e.etat} />
          {peutEcrire && e.etat !== 'payee' && (
            <button className="bouton bouton-petit" onClick={() => ouvrirSaisie({ poste_id: e.poste_id, periode: e.periode, montant: e.reste || '' })}>Payer</button>
          )}
          {peutEcrire && <button className="lien" onClick={changerMontant}>Montant</button>}
          {estGerant && e.etat !== 'payee' && (
            <button className="lien lien-doux" onClick={() => window.confirm(`Rien à payer pour ${e.poste.nom} en ${nomPeriode(e.periode)} ?`) && changer({ ignoree: true })}>Rien à payer</button>
          )}
        </div>
      </div>
      <div className="ligne-montant">
        {e.montant_prevu ? formatFcfa(e.montant_prevu) : <span className="texte-doux">Montant ?</span>}
        {e.montantPaye > 0 && e.etat !== 'payee' && <div className="petit texte-doux">payé {formatFcfa(e.montantPaye)}</div>}
      </div>
    </li>
  )
}

export default function Echeances(props) {
  const { vue, periode } = props
  const [erreur, setErreur] = useState('')
  const retards = vue.enRetard.filter((e) => e.periode !== periode)
  const duMois = vue.echeancesMois
  const ordre = { en_retard: 0, bientot: 1, partiel: 2, a_venir: 3, payee: 4 }
  const tri = [...duMois].sort((a, b) => ordre[a.etat] - ordre[b.etat] || a.date_limite.localeCompare(b.date_limite))
  const paye = duMois.filter((e) => e.etat === 'payee').length
  const commun = { ...props, setErreur }

  return (
    <div className="pile">
      {erreur && <p className="texte-erreur">{erreur}</p>}
      {retards.length > 0 && (
        <section className="carte carte-rouge">
          <h2>Restés impayés des mois précédents ({retards.length})</h2>
          <ul className="liste">{retards.map((e) => <Ligne key={e.id} e={e} {...commun} />)}</ul>
        </section>
      )}
      <section className="carte">
        <div className="titre-section">
          <h2>Échéances de {nomPeriode(periode)}</h2>
          <span className="texte-doux">{paye} / {duMois.length} payées</span>
        </div>
        {duMois.length > 0 && (
          <div className="progression" aria-label={`${paye} sur ${duMois.length} payées`}>
            <span style={{ width: `${(paye / duMois.length) * 100}%` }} />
          </div>
        )}
        {tri.length === 0 ? <Vide>Aucune échéance ce mois-ci. Les postes réguliers se règlent dans Réglages.</Vide> : (
          <ul className="liste">{tri.map((e) => <Ligne key={e.id} e={e} {...commun} />)}</ul>
        )}
        <p className="texte-doux petit">Les échéances viennent des postes réguliers (loyer, CNSS, internet…). Une dépense enregistrée pour le bon mois les marque comme payées.</p>
      </section>
    </div>
  )
}
