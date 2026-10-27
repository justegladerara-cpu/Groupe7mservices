// Règles de calcul du tableau de bord (fonctions pures, testées dans tests/).

export const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

// Une période est le premier jour du mois, au format 'AAAA-MM-01'.
export function periodeDe(date) {
  const d = typeof date === 'string' ? new Date(date + (date.length === 10 ? 'T00:00:00' : '')) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function decalerPeriode(periode, mois) {
  const [a, m] = periode.split('-').map(Number)
  const total = a * 12 + (m - 1) + mois
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}

export function nomPeriode(periode) {
  const [a, m] = periode.split('-').map(Number)
  return `${MOIS[m - 1]} ${a}`
}

export function nomPeriodeCourt(periode) {
  const [, m] = periode.split('-').map(Number)
  return MOIS[m - 1]
}

export function dateIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Nombre de jours entre aujourd'hui et une date (négatif si elle est passée).
export function joursAvant(dateStr, aujourdhui = new Date()) {
  const cible = new Date(dateStr + 'T00:00:00')
  const jour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())
  return Math.round((cible - jour) / 86400000)
}

export function formatFcfa(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  const v = Math.round(Number(n))
  return v.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA'
}

export function formatNombre(n) {
  if (n === null || n === undefined) return '—'
  return Math.round(Number(n)).toLocaleString('fr-FR').replace(/ | /g, ' ')
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [a, m, j] = dateStr.slice(0, 10).split('-').map(Number)
  return `${j} ${MOIS[m - 1]} ${a}`
}

// ---------- Échéances ----------

// Date limite d'une échéance : jour J du mois (période + décalage), ramené au dernier jour du mois si besoin.
export function dateLimite(periode, jour, decalage = 0) {
  const p = decalerPeriode(periode, decalage)
  const [a, m] = p.split('-').map(Number)
  const dernier = new Date(a, m, 0).getDate()
  return `${a}-${String(m).padStart(2, '0')}-${String(Math.min(jour || 1, dernier)).padStart(2, '0')}`
}

// Un poste a-t-il une échéance pour cette période ?
export function aEcheance(poste, periode) {
  if (!poste.actif) return false
  const m = Number(periode.split('-')[1])
  const ref = poste.mois_reference || 1
  switch (poste.periodicite) {
    case 'mensuelle': return true
    case 'trimestrielle': return ((m - ref) % 3 + 3) % 3 === 0
    case 'semestrielle': return ((m - ref) % 6 + 6) % 6 === 0
    case 'annuelle': return m === ref
    default: return false
  }
}

// État d'une échéance : 'payee' | 'en_retard' | 'bientot' | 'a_venir'.
export function etatEcheance({ dateLimite: limite, montantPrevu, montantPaye }, aujourdhui = new Date()) {
  const paye = Number(montantPaye || 0)
  if (paye > 0 && (!montantPrevu || paye >= Number(montantPrevu))) return 'payee'
  const j = joursAvant(limite, aujourdhui)
  if (j < 0) return 'en_retard'
  if (j <= 5) return 'bientot'
  return 'a_venir'
}

export const LIBELLE_ETAT = {
  payee: 'Payé',
  en_retard: 'En retard',
  bientot: 'Bientôt dû',
  a_venir: 'À venir',
  partiel: 'Payé en partie',
}

// ---------- Autorisations ----------

// 'a_completer' | 'permanente' | 'expiree' | 'bientot' | 'valide'
export function etatAutorisation(a, aujourdhui = new Date()) {
  if (!a.date_fin) return a.date_debut || a.document_path ? 'permanente' : 'a_completer'
  const j = joursAvant(a.date_fin, aujourdhui)
  if (j < 0) return 'expiree'
  if (j <= (a.rappel_jours ?? 60)) return 'bientot'
  return 'valide'
}

export function phraseAutorisation(a, aujourdhui = new Date()) {
  const e = etatAutorisation(a, aujourdhui)
  if (e === 'a_completer') return 'Date de validité à saisir.'
  if (e === 'permanente') return 'Sans date de fin.'
  const j = joursAvant(a.date_fin, aujourdhui)
  if (e === 'expiree') return `Expirée depuis ${-j} jour${-j > 1 ? 's' : ''}. À renouveler tout de suite.`
  if (j === 0) return "Expire aujourd'hui. À renouveler tout de suite."
  if (e === 'bientot') return `Expire dans ${j} jour${j > 1 ? 's' : ''}. Lancer le renouvellement.`
  return `Valide encore ${j} jours (jusqu'au ${formatDate(a.date_fin)}).`
}

// ---------- CNSS ----------

// Taux CNSS Congo relevés sur l'accusé de réception (total 24,28 % du brut).
export const TAUX_CNSS = {
  pvid: 0.12, // pensions : 8 % employeur + 4 % salarié
  pf: 0.1003, // prestations familiales (employeur)
  rp: 0.0225, // risques professionnels (employeur)
}
export const TAUX_CNSS_TOTAL = TAUX_CNSS.pvid + TAUX_CNSS.pf + TAUX_CNSS.rp

export function calculCnss(brut) {
  const b = Number(brut || 0)
  const pvid = Math.round(b * TAUX_CNSS.pvid)
  const pf = Math.round(b * TAUX_CNSS.pf)
  const rp = Math.round(b * TAUX_CNSS.rp)
  return {
    pvid, pf, rp,
    total: pvid + pf + rp,
    partSalarie: Math.round(b * 0.04),
    partEmployeur: pvid + pf + rp - Math.round(b * 0.04),
  }
}

// État d'un mois CNSS : déclaration + paiement.
// Retourne { etat, phrase } avec etat parmi 'paye' | 'declare' | 'en_retard' | 'a_declarer' | 'pas_encore'.
export function etatMoisCnss({ periode, declaration, paye, jourLimite = 20 }, aujourdhui = new Date()) {
  const limite = dateLimite(periode, jourLimite, 1)
  const j = joursAvant(limite, aujourdhui)
  const du = declaration ? Number(declaration.montant_declare || 0) : 0
  const p = Number(paye || 0)
  if (periode > periodeDe(aujourdhui)) return { etat: 'pas_encore', limite, phrase: 'Mois pas encore commencé.' }
  if (!declaration || !declaration.date_declaration) {
    if (j < 0) return { etat: 'en_retard', limite, phrase: `Pas déclaré. Retard de ${-j} jours : risque de majorations.` }
    if (periode === periodeDe(aujourdhui)) return { etat: 'a_declarer', limite, phrase: `Mois en cours. À déclarer avant le ${formatDate(limite)}.` }
    return { etat: 'a_declarer', limite, phrase: `À déclarer avant le ${formatDate(limite)} (${j} jours).` }
  }
  const tard = joursAvant(limite, new Date(declaration.date_declaration + 'T00:00:00')) < 0
  if (du > 0 && p >= du) {
    return { etat: 'paye', limite, phrase: tard ? 'Déclaré en retard, payé.' : 'Déclaré et payé.' }
  }
  if (p > 0) return { etat: 'declare', limite, phrase: `Déclaré. Payé ${formatFcfa(p)} sur ${formatFcfa(du)}.` }
  if (j < 0) return { etat: 'en_retard', limite, phrase: `Déclaré, mais pas encore payé (${formatFcfa(du)}).` }
  return { etat: 'declare', limite, phrase: `Déclaré. ${formatFcfa(du)} à payer avant le ${formatDate(limite)}.` }
}

// Contrôles automatiques sur une déclaration CNSS saisie.
export function controlesCnss(declaration, periode) {
  const alertes = []
  if (!declaration) return alertes
  const brut = Number(declaration.brut || 0)
  const du = Number(declaration.montant_declare || 0)
  if (brut > 0 && du > 0) {
    const attendu = calculCnss(brut).total
    const ecart = du - attendu
    if (Math.abs(ecart) > Math.max(100, attendu * 0.005)) {
      alertes.push(`Montant déclaré ${formatFcfa(du)} au lieu de ${formatFcfa(attendu)} (24,28 % du brut). Écart : ${formatFcfa(ecart)}.`)
    }
  }
  if (declaration.periode_accuse && periode && declaration.periode_accuse !== periode) {
    alertes.push(`L'accusé de réception parle de ${nomPeriode(declaration.periode_accuse)}, pas de ${nomPeriode(periode)}. Vérifier auprès de la CNSS.`)
  }
  if (declaration.non_immatricules > 0) {
    alertes.push(`${declaration.non_immatricules} agent(s) sans numéro CNSS : ils ne sont pas couverts en cas d'accident.`)
  }
  return alertes
}

// ---------- Synthèse ----------

export const GROUPES = {
  agents: { nom: 'Les agents', couleur: '#2563eb' },
  etat: { nom: "L'État", couleur: '#b45309' },
  bureau: { nom: 'Le bureau', couleur: '#0f766e' },
  terrain: { nom: 'Le terrain', couleur: '#7c3aed' },
  protection: { nom: 'Assurances', couleur: '#be185d' },
  autre: { nom: 'Autres', couleur: '#64748b' },
}

export function sommeParCle(lignes, cle, valeur = 'montant') {
  const r = {}
  for (const l of lignes) r[l[cle]] = (r[l[cle]] || 0) + Number(l[valeur] || 0)
  return r
}

// Phrase « est-ce bien ? » pour un poste, d'après le mois précédent.
export function conseilPoste({ nom, ce_mois: ceMois, mois_precedent: avant, montant_habituel: habituel }) {
  const c = Number(ceMois || 0)
  const a = Number(avant || 0)
  const h = Number(habituel || 0)
  if (c === 0 && a === 0) return { ton: 'neutre', texte: 'Rien payé ce mois-ci.' }
  if (h > 0 && c > h * 1.15) {
    return { ton: 'alerte', texte: `${formatFcfa(c - h)} de plus que d'habitude. Vérifier la facture de ${nom.toLowerCase()}.` }
  }
  if (a > 0) {
    const v = (c - a) / a
    if (v > 0.2) return { ton: 'alerte', texte: `En hausse de ${Math.round(v * 100)} % par rapport au mois dernier. Chercher pourquoi.` }
    if (v < -0.2 && c > 0) return { ton: 'bien', texte: `En baisse de ${Math.round(-v * 100)} % par rapport au mois dernier.` }
    if (c === 0) return { ton: 'neutre', texte: `Rien payé ce mois-ci (${formatFcfa(a)} le mois dernier).` }
    return { ton: 'bien', texte: 'Stable par rapport au mois dernier.' }
  }
  return { ton: 'neutre', texte: 'Premier mois suivi : la comparaison viendra le mois prochain.' }
}

export function variation(ceMois, avant) {
  const a = Number(avant || 0)
  if (!a) return null
  return Math.round(((Number(ceMois || 0) - a) / a) * 100)
}

// Premier mois suivi pour la CNSS : la plus ancienne déclaration saisie (sinon le mois dernier).
// Les mois plus anciens ne sont pas signalés en retard.
export function debutSuiviCnss(declarations, aujourdhui = new Date()) {
  const periodes = (declarations || []).map((d) => d.periode).filter(Boolean).sort()
  return periodes[0] || decalerPeriode(periodeDe(aujourdhui), -1)
}
