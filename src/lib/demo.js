// Données FICTIVES pour la démonstration (aucune donnée réelle de Groupe7M).
import { aEcheance, dateIso, dateLimite, decalerPeriode, periodeDe } from './regles.js'

let n = 0
const id = () => `demo-${++n}`
const aujourdhui = new Date()
const ceMois = periodeDe(aujourdhui)

const postes = [
  ['Salaires des agents', 'agents', '👷', 'mensuelle', null, 30, 0, 1800000],
  ['Avances sur salaire', 'agents', '💵', 'ponctuelle', null, 1, 0, null],
  ['CNSS', 'etat', '🛡️', 'mensuelle', null, 20, 1, 440000],
  ['TUS', 'etat', '🏛️', 'mensuelle', null, 20, 1, 135000],
  ['IRPP retenu', 'etat', '🧾', 'mensuelle', null, 20, 1, 88000],
  ['TOL', 'etat', '🏘️', 'mensuelle', null, 20, 1, 10000],
  ['Patente et autres impôts', 'etat', '📜', 'ponctuelle', null, 1, 0, null],
  ['Loyer', 'bureau', '🏢', 'mensuelle', null, 5, 0, 250000],
  ['Électricité', 'bureau', '💡', 'mensuelle', null, 15, 0, 60000],
  ['Eau', 'bureau', '🚰', 'mensuelle', null, 15, 0, 15000],
  ['Internet', 'bureau', '🌐', 'mensuelle', null, 5, 0, 35000],
  ['Téléphone et crédit', 'bureau', '📱', 'ponctuelle', null, 1, 0, null],
  ['Fournitures de bureau', 'bureau', '📎', 'ponctuelle', null, 1, 0, null],
  ['Assurances', 'protection', '☂️', 'annuelle', 1, 15, 0, 400000],
  ['Transport et carburant', 'terrain', '⛽', 'ponctuelle', null, 1, 0, null],
  ['Équipements de sécurité', 'terrain', '🦺', 'ponctuelle', null, 1, 0, null],
  ['Frais bancaires', 'autre', '🏦', 'ponctuelle', null, 1, 0, null],
  ['Autres dépenses', 'autre', '📦', 'ponctuelle', null, 1, 0, null],
].map(([nom, groupe, icone, periodicite, mois_reference, jour_echeance, decalage_mois, montant_habituel], i) => ({
  id: id(), nom, groupe, icone, periodicite, mois_reference, jour_echeance, decalage_mois,
  montant_habituel, beneficiaire: null, aide: null, ordre: (i + 1) * 10, actif: true,
}))
const P = Object.fromEntries(postes.map((p) => [p.nom, p.id]))

const echeances = []
const depenses = []

function preparer(periode) {
  let k = 0
  for (const p of postes) {
    if (!aEcheance(p, periode) || echeances.some((e) => e.poste_id === p.id && e.periode === periode)) continue
    echeances.push({
      id: id(), poste_id: p.id, periode, ignoree: false, note: null,
      date_limite: dateLimite(periode, p.jour_echeance, p.decalage_mois), montant_prevu: p.montant_habituel,
    })
    k++
  }
  return k
}

function jourDe(periode, j) {
  const [a, m] = periode.split('-').map(Number)
  const d = new Date(a, m - 1, j)
  return dateIso(d > aujourdhui ? aujourdhui : d)
}

// Trois mois d'historique fictif.
for (let i = 4; i >= 0; i--) {
  const p = decalerPeriode(ceMois, -i)
  preparer(p)
  const avant = decalerPeriode(p, -1)
  const ajout = (poste, montant, periode, jour, extra = {}) => depenses.push({
    id: id(), poste_id: P[poste], periode, date_paiement: jourDe(p, jour), montant,
    mode_paiement: 'especes', beneficiaire: null, reference: null, note: null, recu_path: null,
    cree_par: 'demo', cree_le: new Date().toISOString(), ...extra,
  })
  ajout('Loyer', 250000, p, 4)
  ajout('Internet', 35000, p, 6, { mode_paiement: 'mobile_money' })
  ajout('Électricité', i === 0 ? 92000 : 58000 + i * 3000, p, 14)
  ajout('Transport et carburant', 45000 + i * 8000, p, 9)
  if (i > 0) {
    ajout('Salaires des agents', 1800000, p, 28, { mode_paiement: 'virement' })
    ajout('CNSS', 440000, avant, 18, { mode_paiement: 'virement' })
    ajout('TUS', 135000, avant, 19, { mode_paiement: 'virement' })
    ajout('IRPP retenu', 88000, avant, 19, { mode_paiement: 'virement' })
    ajout('TOL', 10000, avant, 19)
    ajout('Eau', 15000, p, 13)
  }
  if (i === 0) {
    ajout('TUS', 135000, avant, 18, { mode_paiement: 'virement' })
    ajout('IRPP retenu', 88000, avant, 18, { mode_paiement: 'virement' })
    ajout('TOL', 10000, avant, 18)
  }
  if (i === 2) ajout('Équipements de sécurité', 120000, p, 12)
  if (i === 1) ajout('Avances sur salaire', 150000, p, 15)
  if (i === 0) ajout('Avances sur salaire', 200000, p, 3)
}

const cnss = [2, 3, 4, 5].map((i) => {
  const p = decalerPeriode(ceMois, -i)
  return {
    periode: p, assures: 9, non_immatricules: i === 2 ? 1 : 0, brut: 1810000, montant_declare: 439468,
    date_declaration: dateLimite(p, 15, 1), periode_accuse: p, accuse_path: null, note: null,
  }
})

const autorisations = [
  ['Agrément de mise à disposition de personnel', 'Ministère du Travail', 'AGR-0000', -400, 45],
  ['RCCM', 'Tribunal de commerce', 'CG-PNR-00-B00', -1500, null],
  ['NIU', 'Impôts', 'M00000000000', -1500, null],
  ['Patente', 'Impôts', null, -300, 65],
  ['Attestation de mise à jour CNSS', 'CNSS', null, -100, -10],
  ['Attestation de non-redevance fiscale', 'Impôts', null, null, null],
  ['Assurance responsabilité civile', 'Assureur', null, -200, 165],
  ['Bail du bureau', 'Propriétaire', null, -700, 395],
].map(([nom, organisme, numero, debut, fin], i) => {
  const d = (x) => (x === null ? null : dateIso(new Date(aujourdhui.getTime() + x * 86400000)))
  return { id: id(), nom, organisme, numero, date_debut: d(debut), date_fin: d(fin), rappel_jours: 60, document_path: null, note: null, ordre: (i + 1) * 10 }
})

const pause = (v) => new Promise((ok) => setTimeout(() => ok(structuredClone(v)), 120))
const err = () => { throw new Error('Démonstration : les documents ne sont pas enregistrés.') }

export const monRole = async () => pause({ nom: 'Démonstration', role: 'gerant' })
export const listerPostes = async () => pause([...postes].sort((a, b) => a.ordre - b.ordre))
export async function enregistrerPoste(poste) {
  if (poste.id) Object.assign(postes.find((p) => p.id === poste.id), poste)
  else postes.push({ ...poste, id: id() })
  return pause(poste)
}
export const preparerMois = async (periode) => pause(periode <= ceMois ? preparer(periode) : 0)
export const listerDepenses = async (depuis, jusqua) => {
  const fin = decalerPeriode(jusqua, 1)
  return pause(depenses.filter((d) => d.date_paiement >= depuis && d.date_paiement < fin)
    .sort((a, b) => b.date_paiement.localeCompare(a.date_paiement)))
}
export const depensesDesPeriodes = async (depuis, jusqua) =>
  pause(depenses.filter((d) => d.periode >= depuis && d.periode <= jusqua))
export async function ajouterDepense(d) {
  const ligne = { id: id(), cree_par: 'demo', cree_le: new Date().toISOString(), ...d }
  depenses.push(ligne)
  return pause(ligne)
}
export async function supprimerDepense(i) {
  depenses.splice(depenses.findIndex((d) => d.id === i), 1)
  return pause(null)
}
export const listerEcheances = async (depuis, jusqua) =>
  pause(echeances.filter((e) => e.periode >= depuis && e.periode <= jusqua).sort((a, b) => a.date_limite.localeCompare(b.date_limite)))
export async function modifierEcheance(i, champs) {
  Object.assign(echeances.find((e) => e.id === i), champs)
  return pause(null)
}
export const listerCnss = async () => pause([...cnss].sort((a, b) => b.periode.localeCompare(a.periode)))
export async function enregistrerCnss(ligne) {
  const i = cnss.findIndex((c) => c.periode === ligne.periode)
  if (i >= 0) cnss[i] = { ...cnss[i], ...ligne }
  else cnss.push(ligne)
  return pause(ligne)
}
export const listerAutorisations = async () => pause([...autorisations].sort((a, b) => a.ordre - b.ordre))
export async function enregistrerAutorisation(a) {
  if (a.id) Object.assign(autorisations.find((x) => x.id === a.id), a)
  else autorisations.push({ ...a, id: id(), ordre: 999 })
  return pause(a)
}
export async function supprimerAutorisation(i) {
  autorisations.splice(autorisations.findIndex((a) => a.id === i), 1)
  return pause(null)
}
export const envoyerDocument = async () => err()
export const ouvrirDocument = async () => err()

// ---------- Clients, factures, paie (fictifs) ----------
const clients = [
  { id: 'demo-client-1', nom: 'Pétrole Démo SA', delai_paiement: 45, actif: true, note: null, contact: 'Service achats', contrat_debut: dateIso(new Date(aujourdhui.getFullYear() - 1, 0, 1)), contrat_fin: dateIso(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 2, 0)), coefficient: 1.2 },
  { id: 'demo-client-2', nom: 'Chantier Naval Démo', delai_paiement: 30, actif: true, note: null, contact: null, contrat_debut: null, contrat_fin: null, coefficient: 1.2 },
]
const factures = []
const paie = []
let numero = 40
for (let i = 5; i >= 1; i--) {
  const p = decalerPeriode(ceMois, -i)
  const emise = jourDe(decalerPeriode(p, 1), 12)
  const ajoutF = (client_id, type, lignes, paye) => {
    const montant = lignes.reduce((s, l) => s + l.quantite * l.prix, 0)
    factures.push({
      id: id(), numero: `${String(++numero).padStart(3, '0')}/${p.slice(5, 7)}/${p.slice(0, 4)}`, client_id, periode: p,
      date_facture: emise, type, site: type === 'maintenance' ? 'Plateforme Démo (offshore)' : 'Base Démo (onshore)', lignes,
      montant, montant_paye: paye ? montant : 0, date_paiement: paye ? jourDe(decalerPeriode(p, 2), 20) : null, document_path: null, note: null,
    })
  }
  ajoutF('demo-client-1', 'journalier', [
    { agent: 'Agent A', qualification: 'Électricien', unite: 'jour', quantite: 22, prix: 37000 },
    { agent: 'Agent B', qualification: 'Manœuvre', unite: 'jour', quantite: 24, prix: 20000 },
    { agent: 'Agent C', qualification: 'Chauffeur', unite: 'jour', quantite: 20, prix: 19800 },
  ], i >= 3)
  ajoutF('demo-client-1', 'maintenance', [
    { agent: 'Agent D', qualification: 'Electrical senior', unite: 'heure', quantite: 210, prix: 7536 },
  ], i >= 3)
  if (i % 2) ajoutF('demo-client-2', 'journalier', [{ agent: 'Agent E', qualification: 'Soudeur', unite: 'jour', quantite: 18, prix: 30000 }], i >= 2)
  paie.push({ periode: p, effectif: 5, brut: 1650000, indemnites: 220000, charges: 450000, agents: i === 1 ? 'Agent A\nAgent B\nAgent D\nAgent E' : 'Agent A\nAgent B\nAgent C\nAgent D\nAgent E', note: null })
}

export const listerClients = async () => pause(clients)
export async function enregistrerClient(c) {
  if (c.id) Object.assign(clients.find((x) => x.id === c.id), c)
  else clients.push({ ...c, id: id() })
  return pause(c)
}
export const listerFactures = async () => pause([...factures].sort((a, b) => b.date_facture.localeCompare(a.date_facture) || b.numero.localeCompare(a.numero)))
export async function enregistrerFacture(f) {
  if (factures.some((x) => x.id !== f.id && x.numero === f.numero)) throw new Error('Ce numéro de facture existe déjà.')
  if (f.id) Object.assign(factures.find((x) => x.id === f.id), f)
  else factures.push({ ...f, id: id() })
  return pause(f)
}
export async function supprimerFacture(i) {
  factures.splice(factures.findIndex((f) => f.id === i), 1)
  return pause(null)
}
export const listerPaie = async () => pause([...paie].sort((a, b) => b.periode.localeCompare(a.periode)))
export async function enregistrerPaie(ligne) {
  const i = paie.findIndex((x) => x.periode === ligne.periode)
  if (i >= 0) paie[i] = { ...paie[i], ...ligne }
  else paie.push(ligne)
  return pause(ligne)
}

// ---------- Agents (fictifs) ----------
const dansJours = (n) => dateIso(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + n))
const agents = [
  ['Agent A', 'Électricien', 'demo-client-1', 'Base Démo (onshore)', 'cdd', -300, 200, 650000, 'jour', 37000, '100001'],
  ['Agent B', 'Manœuvre', 'demo-client-1', 'Base Démo (onshore)', 'cdd', -200, 18, 300000, 'jour', 20000, '100002'],
  ['Agent C', 'Chauffeur', 'demo-client-1', 'Base Démo (onshore)', 'journalier', -60, null, 330000, 'jour', 19800, null],
  ['Agent D', 'Electrical senior', 'demo-client-1', 'Plateforme Démo (offshore)', 'cdi', -900, null, 1300000, 'heure', 7536, '100004'],
  ['Agent E', 'Soudeur', 'demo-client-2', 'Chantier Démo', 'cdd', -120, -3, 520000, 'jour', 30000, '100005'],
].map(([nom, qualification, client_id, site, type_contrat, debut, fin, salaire_base, unite_facture, prix_facture, matricule_cnss]) => ({
  id: id(), nom, qualification, client_id, site, statut: 'actif', type_contrat, debut: dansJours(debut), fin: fin === null ? null : dansJours(fin),
  salaire_base, unite_facture, prix_facture, matricule_cnss, telephone: null, note: null,
}))
export const listerAgents = async () => pause([...agents].sort((a, b) => a.nom.localeCompare(b.nom)))
export async function enregistrerAgent(a) {
  if (a.id) Object.assign(agents.find((x) => x.id === a.id), a)
  else agents.push({ ...a, id: id() })
  return pause(a)
}
export async function supprimerAgent(i) {
  agents.splice(agents.findIndex((x) => x.id === i), 1)
  return pause(null)
}
