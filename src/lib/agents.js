// Agents placés chez les clients : coût, prix plancher de la convention, alertes (fonctions pures, testées).
import { formatFcfa, joursAvant } from './regles.js'
import { memeAgent } from './facturation.js'

export const TYPES_CONTRAT = { cdd: 'CDD', cdi: 'CDI', journalier: 'Journalier' }
export const STATUTS_EMPLOI = { salarie: 'Salarié (bulletin de paie)', prestataire: 'Prestataire (facture, 10 % retenus)' }
export const UNITES_FACTURE = { jour: 'par jour', heure: 'par heure' }

// Charges de l'employeur sur le brut : CNSS part employeur (20,28 %) + TUS (7,5 %).
export const TAUX_CHARGES_EMPLOYEUR = 0.2028 + 0.075
export const JOURS_PAR_MOIS = 26
export const HEURES_PAR_JOUR = 8

// Bulletins d'un agent, du plus récent au plus ancien.
export function bulletinsDe(agent, bulletins = []) {
  return bulletins.filter((b) => b.agent_id === agent.id).sort((a, b) => (a.periode < b.periode ? 1 : -1))
}

// Ce que l'agent coûte à G7 pour une journée ou une heure de travail.
// D'abord le coût réel du dernier bulletin (salaire, primes, indemnités, charges), sinon une estimation à partir du salaire de base.
export function coutUnitaire(agent, bulletins = []) {
  const reel = bulletinsDe(agent, bulletins).find((b) => b.unite === (agent.unite_facture || 'jour') && Number(b.nombre) > 0)
  if (reel) return Math.round(Number(reel.cout) / Number(reel.nombre))
  const base = Number(agent.salaire_base || 0)
  if (!base) return null
  const jour = (base * (1 + TAUX_CHARGES_EMPLOYEUR)) / JOURS_PAR_MOIS
  return Math.round(agent.unite_facture === 'heure' ? jour / HEURES_PAR_JOUR : jour)
}

export function coutEstReel(agent, bulletins = []) {
  return bulletinsDe(agent, bulletins).some((b) => b.unite === (agent.unite_facture || 'jour') && Number(b.nombre) > 0)
}

// Prix minimum à facturer selon la convention : coût × coefficient du client (1,2 par défaut).
export function prixPlancher(agent, client, bulletins = []) {
  const cout = coutUnitaire(agent, bulletins)
  return cout === null ? null : Math.round(cout * Number(client?.coefficient || 1.2))
}

// Ce que l'agent rapporte par jour (ou par heure) et sur un mois complet.
export function margeAgent(agent, bulletins = []) {
  const cout = coutUnitaire(agent, bulletins)
  const prix = Number(agent.prix_facture || 0)
  if (cout === null || !prix) return null
  const unites = agent.unite_facture === 'heure' ? JOURS_PAR_MOIS * HEURES_PAR_JOUR : JOURS_PAR_MOIS
  return { cout, parUnite: prix - cout, parMois: Math.round((prix - cout) * unites), taux: Math.round(((prix - cout) / prix) * 100) }
}

// Mois par mois : ce que l'agent a coûté (bulletins) et ce qui a été facturé pour lui (lignes des factures).
export function historiqueAgent(agent, bulletins = [], factures = []) {
  const parMois = {}
  const mois = (p) => (parMois[p] ||= { periode: p, cout: 0, facture: 0, unites: [], notes: [] })
  for (const b of bulletinsDe(agent, bulletins)) {
    const m = mois(b.periode)
    m.cout += Number(b.cout || 0)
    if (b.nombre) m.unites.push(`${Number(b.nombre)} ${b.unite}${Number(b.nombre) > 1 ? 's' : ''} payé${Number(b.nombre) > 1 ? 's' : ''}`)
    if (b.note) m.notes.push(b.note)
  }
  for (const f of factures) {
    for (const l of f.lignes || []) {
      if (l.agent && memeAgent(l.agent, agent.nom)) mois(f.periode).facture += Number(l.quantite || 0) * Number(l.prix || 0)
    }
  }
  return Object.values(parMois)
    .map((m) => ({ ...m, facture: Math.round(m.facture), marge: m.facture && m.cout ? Math.round(m.facture - m.cout) : null, taux: m.facture && m.cout ? Math.round(((m.facture - m.cout) / m.facture) * 100) : null }))
    .sort((a, b) => (a.periode < b.periode ? 1 : -1))
}

// Ce qu'il faut regarder sur un agent, du plus grave au moins grave.
export function alertesAgent(agent, client, aujourdhui = new Date(), bulletins = []) {
  if (agent.statut === 'sorti') return []
  const a = []
  const cout = coutUnitaire(agent, bulletins)
  const plancher = prixPlancher(agent, client, bulletins)
  const prix = Number(agent.prix_facture || 0)
  const unite = UNITES_FACTURE[agent.unite_facture] || ''
  if (cout && prix && prix < cout) {
    a.push({ ton: 'mauvais', cle: 'perte', texte: `Coûte ${formatFcfa(cout)} ${unite}, facturé ${formatFcfa(prix)} : G7 perd de l’argent` })
  } else if (plancher && prix && prix < plancher) {
    a.push({ ton: coutEstReel(agent, bulletins) ? 'vigilance' : 'mauvais', cle: 'prix', texte: `Facturé sous la convention : ${formatFcfa(prix)} au lieu d’au moins ${formatFcfa(plancher)} ${unite}` })
  }
  if (agent.fin) {
    const j = joursAvant(agent.fin, aujourdhui)
    if (j < 0) a.push({ ton: 'mauvais', cle: 'fin', texte: `Contrat terminé depuis ${-j} jour${-j > 1 ? 's' : ''} : renouveler ou sortir l’agent` })
    else if (j <= 30) a.push({ ton: 'vigilance', cle: 'fin', texte: `Contrat qui se termine dans ${j} jour${j > 1 ? 's' : ''}` })
  }
  if (agent.statut_emploi === 'prestataire') a.push({ ton: 'vigilance', cle: 'prestataire', texte: 'Payé sur facture de prestation : pas déclaré à la CNSS' })
  else if (!agent.matricule_cnss) a.push({ ton: 'vigilance', cle: 'cnss', texte: 'Pas de matricule CNSS' })
  const dernier = bulletinsDe(agent, bulletins)[0]
  if (dernier?.note && /patronales|vérifier/i.test(dernier.note)) a.push({ ton: 'vigilance', cle: 'bulletin', texte: 'Dernier bulletin à vérifier' })
  if (!prix && agent.client_id) a.push({ ton: 'vigilance', cle: 'prix_absent', texte: 'Prix facturé au client non renseigné' })
  return a
}

export function resumeAgents(agents, clients, aujourdhui = new Date(), bulletins = [], factures = []) {
  const parId = Object.fromEntries(clients.map((c) => [c.id, c]))
  const actifs = agents.filter((x) => x.statut !== 'sorti')
  const avecAlertes = actifs.map((x) => ({ agent: x, alertes: alertesAgent(x, parId[x.client_id], aujourdhui, bulletins) }))
  const compte = (cle) => avecAlertes.filter((x) => x.alertes.some((al) => al.cle === cle)).length
  const marge = actifs.reduce((s, x) => s + (margeAgent(x, bulletins)?.parMois || 0), 0)
  // Le dernier mois où des bulletins sont rangés : facturé et coût réels, agent par agent.
  const dernierMois = bulletins.reduce((m, b) => (b.periode > m ? b.periode : m), '')
  const duMois = dernierMois
    ? agents.map((x) => ({ agent: x, ...(historiqueAgent(x, bulletins, factures).find((h) => h.periode === dernierMois) || {}) })).filter((x) => x.cout || x.facture)
    : []
  return {
    actifs: actifs.length,
    pertes: compte('perte'),
    sousConvention: compte('prix'),
    finProche: compte('fin'),
    sansCnss: compte('cnss'),
    prestataires: compte('prestataire'),
    margeMensuelle: marge,
    dernierMois,
    duMois,
    avecAlertes,
  }
}
