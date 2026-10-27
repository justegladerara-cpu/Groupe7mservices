import { supabase, configure } from './supabase.js'
import { decalerPeriode } from './regles.js'
import * as demo from './demo.js'

function verifier({ data, error }) {
  if (error) throw new Error(traduireErreur(error))
  return data
}

export function traduireErreur(error) {
  const m = error?.message || String(error)
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.'
  if (/duplicate key.*numero|g7_factures_numero_key/i.test(m)) return 'Ce numéro de facture existe déjà.'
  if (/row-level security|permission denied|Accès réservé/i.test(m)) return "Votre compte n'a pas le droit de faire cette action."
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Pas de connexion internet. Réessayez dans un instant.'
  return m
}

async function monRole(email) {
  const data = verifier(await supabase.from('g7_membres').select('nom, role').eq('email', email.toLowerCase()).maybeSingle())
  return data
}

async function listerPostes() {
  return verifier(await supabase.from('g7_postes').select('*').order('ordre').order('nom'))
}

async function enregistrerPoste(poste) {
  const { id, cree_le, ...champs } = poste
  if (id) return verifier(await supabase.from('g7_postes').update(champs).eq('id', id).select().single())
  return verifier(await supabase.from('g7_postes').insert(champs).select().single())
}

async function preparerMois(periode) {
  return verifier(await supabase.rpc('g7_preparer_mois', { p_periode: periode }))
}

// Dépenses payées entre deux périodes (incluses), par date de paiement.
async function listerDepenses(depuis, jusqua) {
  const fin = decalerPeriode(jusqua, 1)
  return verifier(await supabase.from('g7_depenses').select('*')
    .gte('date_paiement', depuis).lt('date_paiement', fin)
    .order('date_paiement', { ascending: false }).order('cree_le', { ascending: false }))
}

// Dépenses rattachées à des périodes (pour savoir si une échéance est payée).
async function depensesDesPeriodes(depuis, jusqua) {
  return verifier(await supabase.from('g7_depenses').select('poste_id, periode, montant')
    .gte('periode', depuis).lte('periode', jusqua))
}

async function ajouterDepense(depense) {
  return verifier(await supabase.from('g7_depenses').insert(depense).select().single())
}

async function supprimerDepense(id) {
  return verifier(await supabase.from('g7_depenses').delete().eq('id', id))
}

async function listerEcheances(depuis, jusqua) {
  return verifier(await supabase.from('g7_echeances').select('*')
    .gte('periode', depuis).lte('periode', jusqua).order('date_limite'))
}

async function modifierEcheance(id, champs) {
  return verifier(await supabase.from('g7_echeances').update(champs).eq('id', id))
}

async function listerCnss() {
  return verifier(await supabase.from('g7_cnss').select('*').order('periode', { ascending: false }))
}

async function enregistrerCnss(ligne) {
  return verifier(await supabase.from('g7_cnss').upsert({ ...ligne, modifie_le: new Date().toISOString() }).select().single())
}

async function listerAutorisations() {
  return verifier(await supabase.from('g7_autorisations').select('*').order('ordre').order('nom'))
}

async function enregistrerAutorisation(a) {
  const { id, cree_le, ...champs } = a
  if (id) return verifier(await supabase.from('g7_autorisations').update(champs).eq('id', id).select().single())
  return verifier(await supabase.from('g7_autorisations').insert(champs).select().single())
}

async function supprimerAutorisation(id) {
  return verifier(await supabase.from('g7_autorisations').delete().eq('id', id))
}

// ---------- Clients, factures, paie du mois ----------

async function listerClients() {
  return verifier(await supabase.from('g7_clients').select('*').order('nom'))
}

async function enregistrerClient(c) {
  const { id, cree_le, ...champs } = c
  if (id) return verifier(await supabase.from('g7_clients').update(champs).eq('id', id).select().single())
  return verifier(await supabase.from('g7_clients').insert(champs).select().single())
}

async function listerFactures() {
  return verifier(await supabase.from('g7_factures').select('*').order('date_facture', { ascending: false }).order('numero', { ascending: false }))
}

async function enregistrerFacture(f) {
  const { id, cree_le, ...champs } = f
  if (id) return verifier(await supabase.from('g7_factures').update(champs).eq('id', id).select().single())
  return verifier(await supabase.from('g7_factures').insert(champs).select().single())
}

async function supprimerFacture(id) {
  return verifier(await supabase.from('g7_factures').delete().eq('id', id))
}

async function listerPaie() {
  return verifier(await supabase.from('g7_paie_mois').select('*').order('periode', { ascending: false }))
}

async function enregistrerPaie(ligne) {
  return verifier(await supabase.from('g7_paie_mois').upsert({ ...ligne, modifie_le: new Date().toISOString() }).select().single())
}

// ---------- Agents placés ----------

// Si la table n'est pas encore créée dans la base, l'écran Agents l'explique au lieu de tout bloquer.
async function listerAgents() {
  const { data, error } = await supabase.from('g7_agents').select('*').order('nom')
  if (error && /g7_agents|42P01|PGRST205/i.test(`${error.code} ${error.message}`)) return null
  return verifier({ data, error })
}

async function enregistrerAgent(a) {
  const { id, cree_le, ...champs } = a
  if (id) return verifier(await supabase.from('g7_agents').update(champs).eq('id', id).select().single())
  return verifier(await supabase.from('g7_agents').insert(champs).select().single())
}

// Bulletins de paie et factures de prestataires, rangés par agent et par mois.
async function listerBulletins() {
  const { data, error } = await supabase.from('g7_bulletins').select('*').order('periode', { ascending: false })
  if (error && /g7_bulletins|42P01|PGRST205/i.test(`${error.code} ${error.message}`)) return []
  return verifier({ data, error })
}

async function supprimerAgent(id) {
  return verifier(await supabase.from('g7_agents').delete().eq('id', id))
}

// ---------- Documents ----------

// Réduit une photo avant envoi (internet lent) : 1600 px max, JPEG qualité 0,72.
async function reduireImage(fichier) {
  if (!fichier.type.startsWith('image/') || fichier.size < 400 * 1024) return fichier
  const image = await createImageBitmap(fichier)
  const echelle = Math.min(1, 1600 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * echelle)
  canvas.height = Math.round(image.height * echelle)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.72))
  return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : fichier
}

async function envoyerDocument(dossier, fichier) {
  const pret = await reduireImage(fichier)
  const ext = pret.type === 'application/pdf' ? 'pdf' : pret.type === 'image/png' ? 'png' : 'jpg'
  const chemin = `${dossier}/${crypto.randomUUID()}.${ext}`
  verifier(await supabase.storage.from('g7-documents').upload(chemin, pret, { contentType: pret.type }))
  return chemin
}

// La fenêtre est ouverte tout de suite (sinon le téléphone la bloque), puis remplie.
async function ouvrirDocument(chemin) {
  const fenetre = window.open('', '_blank')
  try {
    const data = verifier(await supabase.storage.from('g7-documents').createSignedUrl(chemin, 300))
    if (fenetre) { fenetre.opener = null; fenetre.location.href = data.signedUrl } else window.location.href = data.signedUrl
  } catch (e) {
    fenetre?.close()
    throw e
  }
}

const reel = {
  monRole, listerPostes, enregistrerPoste, preparerMois, listerDepenses, depensesDesPeriodes,
  ajouterDepense, supprimerDepense, listerEcheances, modifierEcheance, listerCnss, enregistrerCnss,
  listerAutorisations, enregistrerAutorisation, supprimerAutorisation, envoyerDocument, ouvrirDocument,
  listerClients, enregistrerClient, listerFactures, enregistrerFacture, supprimerFacture, listerPaie, enregistrerPaie,
  listerAgents, enregistrerAgent, supprimerAgent, listerBulletins,
}

// Sans base configurée, l'application tourne en démonstration avec des données fictives.
export const api = configure ? reel : demo
export const modeDemo = !configure
