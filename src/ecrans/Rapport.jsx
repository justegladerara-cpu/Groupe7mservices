import { formatDate, formatFcfa, GROUPES, nomPeriode, etatAutorisation, periodeDe } from '../lib/regles.js'
import { agentsHorsPaie, encours, etatFacture, margeMois, resteFacture } from '../lib/facturation.js'
import { resumeAgents } from '../lib/agents.js'
import { EnteteXp, pluriel } from '../dream/communs.jsx'
import { Icone } from '../ui/kit.jsx'

// Inspiré du rapport de The Dream : une page à imprimer ou à envoyer en PDF au gérant, pour le mois choisi.
export default function Rapport({ vue, donnees, periode, choixMois }) {
  const { factures, clients, paie, postes, depensesPeriodes, autorisations, agents } = donnees
  const lignePaie = paie.find((x) => x.periode === periode) || null
  const m = margeMois({ periode, factures, paie: lignePaie, depenses: depensesPeriodes, postes })
  const e = encours(factures, clients)
  const encaisse = factures.filter((f) => f.date_paiement && periodeDe(f.date_paiement) === periode).reduce((s, f) => s + Number(f.montant_paye || 0), 0)
  const horsPaie = agentsHorsPaie(factures.filter((f) => f.periode === periode), lignePaie)
  const papiers = autorisations.filter((a) => ['expiree', 'bientot'].includes(etatAutorisation(a)))
  const ra = agents ? resumeAgents(agents, clients) : null
  const parClient = Object.fromEntries(clients.map((c) => [c.id, c]))
  const retards = factures.filter((f) => etatFacture(f, parClient[f.client_id]) === 'en_retard')

  const points = [
    ...retards.map((f) => `Facture ${f.numero} (${parClient[f.client_id]?.nom}) : ${formatFcfa(resteFacture(f))} en retard de paiement.`),
    ...vue.enRetard.map((x) => `${x.poste?.nom} de ${nomPeriode(x.periode)} pas payé (limite ${formatDate(x.date_limite)}).`),
    ...(horsPaie.length ? [`${horsPaie.join(', ')} facturé(s) mais absent(s) de la paie : risque CNSS.`] : []),
    ...papiers.map((a) => `${a.nom} : ${etatAutorisation(a) === 'expiree' ? 'expiré' : 'expire bientôt'}${a.date_fin ? ` (${formatDate(a.date_fin)})` : ''}.`),
    ...(ra?.sousConvention ? [`${pluriel(ra.sousConvention, 'agent facturé', 'agents facturés')} sous le prix de la convention.`] : []),
    ...(ra?.finProche ? [`${pluriel(ra.finProche, 'contrat d’agent', 'contrats d’agents')} à renouveler sous 30 jours.`] : []),
  ]

  return (
    <>
      <div className="g7-pas-imprime">
        <EnteteXp surtitre="Pilotage" titre="Rapport du mois" sousTitre="Une page à imprimer ou à enregistrer en PDF pour le gérant.">
          <button className="bouton principal" onClick={() => window.print()}><Icone nom="imprimer" taille={16} />Imprimer ou PDF</button>
          {choixMois}
        </EnteteXp>
      </div>

      <article className="xp-carte g7-rapport">
        <header className="g7-rapport-tete">
          <img src={`${import.meta.env.BASE_URL}logo-g7.png`} alt="Groupe7M Services" />
          <div>
            <h2>Rapport {/^[aeiou]/.test(nomPeriode(periode)) ? 'd’' : 'de '}{nomPeriode(periode)}</h2>
            <small>Établi le {formatDate(new Date().toISOString().slice(0, 10))}</small>
          </div>
        </header>

        <h3>L’argent du mois</h3>
        <table className="g7-rapport-table">
          <tbody>
            <tr><td>Facturé aux clients (travail de {nomPeriode(periode)})</td><td>{formatFcfa(m.facture)}</td></tr>
            <tr><td>Coût de la paie (salaires, primes, CNSS et TUS)</td><td>{m.coutPaie === null ? 'pas saisi' : formatFcfa(m.coutPaie)}</td></tr>
            <tr className="fort"><td>Reste après la paie</td><td>{m.apresPaie === null ? '—' : `${formatFcfa(m.apresPaie)} (${m.taux} %)`}</td></tr>
            <tr><td>Frais du bureau et autres dépenses</td><td>{formatFcfa(m.frais)}</td></tr>
            <tr className="fort"><td>Résultat du mois</td><td>{m.resultat === null ? '—' : formatFcfa(m.resultat)}</td></tr>
          </tbody>
        </table>

        <h3>Encaissements et dettes</h3>
        <table className="g7-rapport-table">
          <tbody>
            <tr><td>Encaissé pendant le mois</td><td>{formatFcfa(encaisse)}</td></tr>
            <tr><td>Les clients doivent encore</td><td>{formatFcfa(e.du)}</td></tr>
            <tr><td>Dont en retard</td><td>{formatFcfa(e.retard)}</td></tr>
            <tr><td>Reste à payer ce mois (charges prévues)</td><td>{formatFcfa(vue.resteAPayer)}</td></tr>
          </tbody>
        </table>

        <h3>Dépenses payées en {nomPeriode(periode)}</h3>
        <table className="g7-rapport-table">
          <tbody>
            {Object.entries(vue.parGroupe).sort((a, b) => b[1] - a[1]).map(([g, montant]) => (
              <tr key={g}><td>{GROUPES[g]?.nom || g}</td><td>{formatFcfa(montant)}</td></tr>
            ))}
            <tr className="fort"><td>Total</td><td>{formatFcfa(vue.total)}</td></tr>
          </tbody>
        </table>

        <h3>À traiter</h3>
        {points.length === 0 ? <p>Rien d’anormal ce mois-ci.</p> : (
          <ul className="g7-rapport-points">{points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        )}
      </article>
    </>
  )
}
