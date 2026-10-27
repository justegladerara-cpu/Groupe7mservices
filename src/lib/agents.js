// Agents placés chez les clients : coût, prix plancher de la convention, alertes (fonctions pures, testées).
import { formatFcfa, joursAvant } from './regles.js'

export const TYPES_CONTRAT = { cdd: 'CDD', cdi: 'CDI', journalier: 'Journalier' }
export const UNITES_FACTURE = { jour: 'par jour', heure: 'par heure' }

// Charges de l'employeur sur le brut : CNSS part employeur (20,28 %) + TUS (7,5 %).
export const TAUX_CHARGES_EMPLOYEUR = 0.2028 + 0.075
export const JOURS_PAR_MOIS = 26
export const HEURES_PAR_JOUR = 8

// Ce que l'agent coûte à G7 pour une journée ou une heure de travail.
export function coutUnitaire(agent) {
  const base = Number(agent.salaire_base || 0)
  if (!base) return null
  const jour = (base * (1 + TAUX_CHARGES_EMPLOYEUR)) / JOURS_PAR_MOIS
  return Math.round(agent.unite_facture === 'heure' ? jour / HEURES_PAR_JOUR : jour)
}

// Prix minimum à facturer selon la convention : coût × coefficient du client (1,2 par défaut).
export function prixPlancher(agent, client) {
  const cout = coutUnitaire(agent)
  return cout === null ? null : Math.round(cout * Number(client?.coefficient || 1.2))
}

// Ce que l'agent rapporte par mois à temps plein (prix facturé moins coût).
export function margeAgent(agent) {
  const cout = coutUnitaire(agent)
  const prix = Number(agent.prix_facture || 0)
  if (cout === null || !prix) return null
  const unites = agent.unite_facture === 'heure' ? JOURS_PAR_MOIS * HEURES_PAR_JOUR : JOURS_PAR_MOIS
  return { parUnite: prix - cout, parMois: Math.round((prix - cout) * unites), taux: Math.round(((prix - cout) / prix) * 100) }
}

// Ce qu'il faut regarder sur un agent, du plus grave au moins grave.
export function alertesAgent(agent, client, aujourdhui = new Date()) {
  if (agent.statut === 'sorti') return []
  const a = []
  const plancher = prixPlancher(agent, client)
  const prix = Number(agent.prix_facture || 0)
  if (plancher && prix && prix < plancher) {
    a.push({ ton: 'mauvais', cle: 'prix', texte: `Facturé sous la convention : ${formatFcfa(prix)} au lieu d’au moins ${formatFcfa(plancher)} ${UNITES_FACTURE[agent.unite_facture]}` })
  }
  if (agent.fin) {
    const j = joursAvant(agent.fin, aujourdhui)
    if (j < 0) a.push({ ton: 'mauvais', cle: 'fin', texte: `Contrat terminé depuis ${-j} jour${-j > 1 ? 's' : ''} : renouveler ou sortir l’agent` })
    else if (j <= 30) a.push({ ton: 'vigilance', cle: 'fin', texte: `Contrat qui se termine dans ${j} jour${j > 1 ? 's' : ''}` })
  }
  if (!agent.matricule_cnss) a.push({ ton: 'vigilance', cle: 'cnss', texte: 'Pas de matricule CNSS' })
  if (!prix) a.push({ ton: 'vigilance', cle: 'prix_absent', texte: 'Prix facturé au client non renseigné' })
  return a
}

export function resumeAgents(agents, clients, aujourdhui = new Date()) {
  const parId = Object.fromEntries(clients.map((c) => [c.id, c]))
  const actifs = agents.filter((x) => x.statut !== 'sorti')
  const avecAlertes = actifs.map((x) => ({ agent: x, alertes: alertesAgent(x, parId[x.client_id], aujourdhui) }))
  const compte = (cle) => avecAlertes.filter((x) => x.alertes.some((al) => al.cle === cle)).length
  const marge = actifs.reduce((s, x) => s + (margeAgent(x)?.parMois || 0), 0)
  return {
    actifs: actifs.length,
    sousConvention: compte('prix'),
    finProche: compte('fin'),
    sansCnss: compte('cnss'),
    margeMensuelle: marge,
    avecAlertes,
  }
}
