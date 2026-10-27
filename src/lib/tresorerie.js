// Trésorerie prévue semaine par semaine (idée reprise de The Dream, adaptée à G7 : un gros client à 45 jours, une paie chaque mois).
import { aEcheance, dateIso, dateLimite, decalerPeriode, periodeDe } from './regles.js'
import { ajouterJours, echeanceFacture, resteFacture } from './facturation.js'

export const SCENARIOS = {
  prudent: { nom: 'Prudent', retard: 30, encaisse: 0.9, activite: 0.85 },
  central: { nom: 'Normal', retard: 10, encaisse: 1, activite: 1 },
  optimiste: { nom: 'Optimiste', retard: 0, encaisse: 1, activite: 1.05 },
}

const POSTES_DE_PAIE = new Set(['Salaires des agents', 'Avances sur salaire', 'CNSS', 'TUS', 'IRPP retenu'])

function lundi(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

// Moyenne des 3 derniers mois connus (paie ou facturé).
function moyenne(valeurs) {
  const v = valeurs.filter((x) => x > 0).slice(0, 3)
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0
}

// Mouvements prévus (date, montant signé, libellé, sûr ou estimé) avant application du scénario.
export function mouvementsPrevus({ factures, clients, postes, paie, depensesPeriodes = [], aujourdhui = new Date(), semaines = 12 }) {
  const debut = dateIso(lundi(aujourdhui))
  const fin = ajouterJours(debut, semaines * 7)
  const parId = Object.fromEntries(clients.map((c) => [c.id, c]))
  const m = []

  // Entrées sûres : ce que les clients doivent déjà.
  for (const f of factures) {
    const reste = resteFacture(f)
    if (reste) m.push({ type: 'facture', date: echeanceFacture(f, parId[f.client_id]), montant: reste, libelle: `Facture ${f.numero}` })
  }

  // Entrées estimées : les mois de travail pas encore facturés, au rythme moyen des derniers mois.
  const parMois = {}
  for (const f of factures) parMois[f.periode] = (parMois[f.periode] || 0) + Number(f.montant || 0)
  const moisConnus = Object.keys(parMois).sort().reverse()
  const factureMoyen = moyenne(moisConnus.map((p) => parMois[p]))
  const delai = clients[0]?.delai_paiement ?? 45
  const ceMois = periodeDe(aujourdhui)
  for (let p = decalerPeriode(ceMois, -1); p <= periodeDe(new Date(fin)); p = decalerPeriode(p, 1)) {
    if (parMois[p] || !factureMoyen) continue
    // Facture émise vers le 10 du mois suivant, payée au bout du délai du client.
    const emise = dateLimite(p, 10, 1)
    m.push({ type: 'estime', date: ajouterJours(emise, delai), montant: Math.round(factureMoyen), libelle: `Travail de ${p.slice(0, 7)} (estimé)` })
  }

  // Sorties : la paie (moyenne des derniers mois), salaires vers le 30, charges le 20 du mois suivant.
  const triee = [...paie].sort((a, b) => (a.periode < b.periode ? 1 : -1))
  const salaires = moyenne(triee.map((x) => Number(x.brut || 0) + Number(x.indemnites || 0)))
  const charges = moyenne(triee.map((x) => Number(x.charges || 0)))
  const posteSalaires = postes.find((p) => p.nom === 'Salaires des agents')
  for (let p = decalerPeriode(ceMois, -1); p <= periodeDe(new Date(fin)); p = decalerPeriode(p, 1)) {
    if (salaires) m.push({ type: 'paie', date: dateLimite(p, posteSalaires?.jour_echeance || 30, 0), montant: -Math.round(salaires), libelle: 'Salaires des agents' })
    if (charges) m.push({ type: 'paie', date: dateLimite(p, 20, 1), montant: -Math.round(charges), libelle: 'CNSS et TUS' })
  }

  // Sorties : les frais du bureau à leur échéance habituelle (loyer, électricité…), sauf s'ils sont déjà payés.
  for (let p = ceMois; p <= periodeDe(new Date(fin)); p = decalerPeriode(p, 1)) {
    for (const poste of postes) {
      if (POSTES_DE_PAIE.has(poste.nom) || poste.groupe === 'agents' || !poste.montant_habituel || !aEcheance(poste, p)) continue
      if (depensesPeriodes.some((d) => d.poste_id === poste.id && d.periode === p)) continue
      m.push({ type: 'frais', date: dateLimite(p, poste.jour_echeance, poste.decalage_mois), montant: -Number(poste.montant_habituel), libelle: poste.nom })
    }
  }
  return { debut, fin, mouvements: m }
}

// Applique un scénario et range les mouvements par semaine, avec le solde à la fin de chaque semaine.
export function prevision({ solde = 0, scenario = 'central', semaines = 12, ...donnees }) {
  const s = SCENARIOS[scenario]
  const { debut, fin, mouvements } = mouvementsPrevus({ ...donnees, semaines })
  const lignes = Array.from({ length: semaines }, (_, i) => ({ debut: ajouterJours(debut, i * 7), entrees: 0, sorties: 0, detail: [] }))
  for (const mv of mouvements) {
    let date = mv.date
    let montant = mv.montant
    if (montant > 0) {
      date = ajouterJours(date, s.retard)
      montant = Math.round(montant * s.encaisse * (mv.type === 'estime' ? s.activite : 1))
    }
    if (date < debut) {
      if (montant < 0) continue // sortie passée : considérée comme payée
      date = debut // facture en retard : attendue cette semaine au plus tôt
    }
    if (date >= fin) continue
    const i = Math.floor((new Date(date + 'T00:00:00') - new Date(debut + 'T00:00:00')) / (7 * 86400000))
    const l = lignes[i]
    if (montant > 0) l.entrees += montant
    else l.sorties += -montant
    l.detail.push({ ...mv, date, montant })
  }
  let courant = Number(solde || 0)
  let minimum = courant
  let premiereNegative = null
  for (const l of lignes) {
    courant += l.entrees - l.sorties
    l.solde = courant
    if (courant < minimum) minimum = courant
    if (courant < 0 && !premiereNegative) premiereNegative = l.debut
  }
  return { lignes, soldeFinal: courant, minimum, premiereNegative }
}
