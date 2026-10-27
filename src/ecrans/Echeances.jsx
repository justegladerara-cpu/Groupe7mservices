import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { formatDate, formatFcfa, joursAvant, nomPeriode } from '../lib/regles.js'
import { EnteteXp, Tuile, pluriel } from '../dream/communs.jsx'
import { Erreur, Icone, Pastille, Vide, iconePoste, tonDe } from '../ui/kit.jsx'

function Ligne({ e, peutEcrire, estGerant, ouvrirSaisie, recharger, setErreur }) {
  const j = joursAvant(e.date_limite)
  const quand = e.etat === 'payee' ? `Payé ${formatFcfa(e.montantPaye)}`
    : j < 0 ? `Dû depuis ${pluriel(-j, 'jour')}` : j === 0 ? "Dû aujourd'hui" : `Dû dans ${pluriel(j, 'jour')}`

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
    <div className="xp-ligne">
      <span className={`g7-puce-icone ${tonDe(e.etat)}`}><Icone nom={iconePoste(e.poste)} taille={16} /></span>
      <div className="xp-ligne-texte">
        <strong>{e.poste.nom} <span className="texte-doux">· {nomPeriode(e.periode)}</span></strong>
        <small>Limite : {formatDate(e.date_limite)} · {quand}</small>
        <span className="g7-actions">
          <Pastille etat={e.etat} />
          {peutEcrire && e.etat !== 'payee' && (
            <button className="bouton principal petit" onClick={() => ouvrirSaisie({ poste_id: e.poste_id, periode: e.periode, montant: e.reste || '' })}>Payer</button>
          )}
          {peutEcrire && <button className="lien" onClick={changerMontant}>Montant</button>}
          {estGerant && e.etat !== 'payee' && (
            <button className="lien" onClick={() => window.confirm(`Rien à payer pour ${e.poste.nom} en ${nomPeriode(e.periode)} ?`) && changer({ ignoree: true })}>Rien à payer</button>
          )}
        </span>
      </div>
      <span className="xp-ligne-valeur">
        {e.montant_prevu ? formatFcfa(e.montant_prevu) : <span className="texte-doux">Montant ?</span>}
        {e.montantPaye > 0 && e.etat !== 'payee' && <small>payé {formatFcfa(e.montantPaye)}</small>}
      </span>
    </div>
  )
}

export default function Echeances(props) {
  const { vue, periode, choixMois } = props
  const [erreur, setErreur] = useState('')
  const retards = vue.enRetard.filter((e) => e.periode !== periode)
  const duMois = vue.echeancesMois
  const ordre = { en_retard: 0, bientot: 1, partiel: 2, a_venir: 3, payee: 4 }
  const tri = [...duMois].sort((a, b) => ordre[a.etat] - ordre[b.etat] || a.date_limite.localeCompare(b.date_limite))
  const paye = duMois.filter((e) => e.etat === 'payee').length
  const commun = { ...props, setErreur }
  const montantRetards = retards.reduce((s, e) => s + Number(e.reste || 0), 0)

  return (
    <>
      <EnteteXp surtitre="Argent" titre="À payer" sousTitre="Les paiements réguliers du mois (loyer, CNSS, internet…) et ce qui est resté impayé avant.">
        {choixMois}
      </EnteteXp>

      <div className="xp-grille">
        <Tuile titre="Reste à payer" icone="echeance" valeur={formatFcfa(vue.resteAPayer)}
          verdict={vue.resteAPayer === 0 && duMois.length ? { ton: 'bon', texte: 'Réglé' } : null}
          pourquoi={`${paye} sur ${duMois.length} échéances payées.`}>
          {duMois.length > 0 && <span className="g7-progression"><span style={{ width: `${(paye / duMois.length) * 100}%` }} /></span>}
        </Tuile>
        <Tuile titre="Impayés des mois précédents" icone="alerte" valeur={String(retards.length)}
          verdict={retards.length ? { ton: 'mauvais', texte: 'En retard' } : { ton: 'bon', texte: 'Aucun' }}
          pourquoi={retards.length ? (montantRetards ? `${formatFcfa(montantRetards)} restent dus.` : 'Montants à préciser.') : 'Rien ne traîne des mois précédents.'} />
      </div>

      <Erreur message={erreur} />

      {retards.length > 0 && (
        <section className="xp-section">
          <h2 className="xp-section-titre">Restés impayés des mois précédents <small>{pluriel(retards.length, 'échéance', 'échéances')}</small></h2>
          <div className="xp-liste">{retards.map((e) => <Ligne key={e.id} e={e} {...commun} />)}</div>
        </section>
      )}

      <section className="xp-section">
        <h2 className="xp-section-titre">Échéances de {nomPeriode(periode)} <small>{paye} / {duMois.length} payées</small></h2>
        {tri.length === 0 ? <Vide titre="Aucune échéance ce mois-ci." texte="Les postes réguliers se règlent dans Paramètres." /> : (
          <div className="xp-liste">{tri.map((e) => <Ligne key={e.id} e={e} {...commun} />)}</div>
        )}
        <p className="g7-note">Les échéances viennent des postes réguliers. Une dépense enregistrée pour le bon mois les marque comme payées.</p>
      </section>
    </>
  )
}
