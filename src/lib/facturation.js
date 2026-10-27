// Règles des factures clients, de la marge et des contrôles (fonctions pures, testées dans tests/).
import { dateIso, joursAvant } from './regles.js'

export const TYPES_FACTURE = {
  journalier: 'À la journée',
  maintenance: 'Maintenance (à l’heure)',
  location: 'Location de véhicule',
  autre: 'Autre',
}
export const UNITES = { jour: 'jour', heure: 'heure', forfait: 'forfait' }

export function ajouterJours(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return dateIso(d)
}

// Date à laquelle le client doit avoir payé (45 jours par défaut, comme sur les factures).
export function echeanceFacture(facture, client) {
  return ajouterJours(facture.date_facture, client?.delai_paiement ?? 45)
}

export function resteFacture(f) {
  return Math.max(0, Number(f.montant || 0) - Number(f.montant_paye || 0))
}

// payee, partielle (un acompte reçu), en_retard (échéance passée), bientot (moins de 10 jours), a_venir.
export function etatFacture(f, client, aujourdhui = new Date()) {
  if (resteFacture(f) === 0) return 'payee'
  const j = joursAvant(echeanceFacture(f, client), aujourdhui)
  if (j < 0) return 'en_retard'
  if (Number(f.montant_paye || 0) > 0) return 'partielle'
  if (j <= 10) return 'bientot'
  return 'a_venir'
}

// Total d'une facture : la somme des lignes (quantité × prix), arrondie au franc.
export function totalLignes(lignes = []) {
  return Math.round(lignes.reduce((s, l) => s + Number(l.quantite || 0) * Number(l.prix || 0), 0))
}

// Prochain numéro, une seule suite pour toutes les factures de l'année : « 129/10/2026 ».
// Plus jamais deux factures avec le même numéro (journalière et maintenance comprises).
export function prochainNumero(factures, periode) {
  const [annee, mois] = periode.split('-')
  let max = 0
  for (const f of factures) {
    const m = /^(\d+)\s*\/\s*\d+\s*\/\s*(\d{4})/.exec(f.numero || '')
    if (m && m[2] === annee) max = Math.max(max, Number(m[1]))
  }
  return `${String(max + 1).padStart(3, '0')}/${mois}/${annee}`
}

export function numeroDejaPris(factures, numero, idActuel) {
  const cle = (n) => String(n || '').replace(/\s+/g, '').toUpperCase()
  return factures.some((f) => (idActuel == null || f.id !== idActuel) && cle(f.numero) === cle(numero))
}

// ---------- Contrôle : agents facturés absents de la paie ----------

const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
const MOTS_COMMUNS = new Set(['JEAN', 'PAUL', 'CLAUDE', 'MARIE', 'PIERRE', 'JACQUES'])
function mots(nom) {
  return sansAccent(nom).split(/[^A-Z]+/).filter((m) => m.length >= 4 && !MOTS_COMMUNS.has(m))
}
function proches(a, b) {
  if (a === b) return true
  if (Math.min(a.length, b.length) < 6 || Math.abs(a.length - b.length) > 1) return false
  // Une lettre de différence (MIYAMONA / MYAMONA, LOEMBE / LOEMBET).
  let i = 0
  let j = 0
  let ecarts = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++ecarts > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return ecarts + (a.length - i) + (b.length - j) <= 1
}

function communs(a, b) {
  const mb = mots(b)
  return mots(a).filter((x) => mb.some((y) => proches(x, y))).length
}

// Même personne : au moins deux mots du nom en commun (ou un seul si l'un des noms n'en a qu'un).
export function memeAgent(a, b) {
  const besoin = Math.min(2, mots(a).length, mots(b).length)
  return besoin > 0 && communs(a, b) >= besoin
}

export function agentsFactures(factures) {
  const noms = []
  for (const f of factures) {
    for (const l of f.lignes || []) {
      const n = String(l.agent || '').trim()
      if (n && !noms.some((x) => memeAgent(x, n))) noms.push(n)
    }
  }
  return noms
}

// Agents qui apparaissent sur les factures du mois mais pas dans la paie du même mois.
// Un seul mot commun suffit (nom écrit plus court dans la paie), sauf si un autre agent facturé porte ce mot.
export function agentsHorsPaie(factures, paie) {
  if (!paie?.agents) return []
  const payes = paie.agents.split('\n').map((s) => s.trim()).filter(Boolean)
  const factures_ = agentsFactures(factures)
  return factures_.filter((n) => {
    if (payes.some((p) => memeAgent(p, n))) return false
    const autres = factures_.filter((x) => x !== n)
    return !mots(n).some((m) => {
      const unique = !autres.some((x) => mots(x).some((y) => proches(y, m)))
      return unique && payes.some((p) => mots(p).some((y) => proches(y, m)))
    })
  })
}

// ---------- Marge ----------

// Ce que le mois rapporte : facturé (mois de travail) moins le coût de la paie, puis moins les frais du bureau.
// Les frais = dépenses du mois hors salaires et cotisations (déjà comptés dans la paie).
const POSTES_DE_PAIE = new Set(['Salaires des agents', 'Avances sur salaire', 'CNSS', 'TUS', 'IRPP retenu'])
export function margeMois({ periode, factures, paie, depenses = [], postes = [] }) {
  const duMois = factures.filter((f) => f.periode === periode)
  const facture = duMois.reduce((s, f) => s + Number(f.montant || 0), 0)
  const coutPaie = paie ? Number(paie.brut || 0) + Number(paie.indemnites || 0) + Number(paie.charges || 0) : null
  const parId = Object.fromEntries(postes.map((p) => [p.id, p]))
  const frais = depenses
    .filter((d) => d.periode === periode && !POSTES_DE_PAIE.has(parId[d.poste_id]?.nom) && parId[d.poste_id]?.groupe !== 'agents')
    .reduce((s, d) => s + Number(d.montant || 0), 0)
  const apresPaie = coutPaie === null ? null : facture - coutPaie
  return {
    periode,
    facture,
    nbFactures: duMois.length,
    coutPaie,
    apresPaie,
    taux: apresPaie === null || facture === 0 ? null : Math.round((apresPaie / facture) * 100),
    frais,
    resultat: apresPaie === null ? null : apresPaie - frais,
  }
}

// Ce que le client doit encore, en retard ou pas, et depuis quand.
export function encours(factures, clients, aujourdhui = new Date()) {
  const parId = Object.fromEntries(clients.map((c) => [c.id, c]))
  let du = 0
  let retard = 0
  let nbRetard = 0
  let plusVieux = null
  for (const f of factures) {
    const reste = resteFacture(f)
    if (!reste) continue
    du += reste
    if (etatFacture(f, parId[f.client_id], aujourdhui) === 'en_retard') {
      retard += reste
      nbRetard++
      const e = echeanceFacture(f, parId[f.client_id])
      if (!plusVieux || e < plusVieux) plusVieux = e
    }
  }
  return { du, retard, nbRetard, plusVieux }
}
