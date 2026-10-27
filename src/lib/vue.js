// Assemble les chiffres affichés à partir des lignes brutes de la base (fonction pure).
import { conseilPoste, decalerPeriode, etatEcheance, periodeDe } from './regles.js'

export function construireVue({ postes, depenses, echeances, depensesPeriodes, periode, aujourdhui = new Date() }) {
  const avant = decalerPeriode(periode, -1)
  const parId = Object.fromEntries(postes.map((p) => [p.id, p]))
  const duMois = depenses.filter((d) => periodeDe(d.date_paiement) === periode)
  const duMoisAvant = depenses.filter((d) => periodeDe(d.date_paiement) === avant)
  const somme = (l) => l.reduce((s, d) => s + Number(d.montant || 0), 0)

  // Payé par poste et par période concernée.
  const paye = {}
  for (const d of depensesPeriodes) {
    const k = `${d.poste_id}|${d.periode}`
    paye[k] = (paye[k] || 0) + Number(d.montant || 0)
  }

  const echeancesVue = echeances
    .filter((e) => !e.ignoree && parId[e.poste_id])
    .map((e) => {
      const montantPaye = paye[`${e.poste_id}|${e.periode}`] || 0
      const etat = etatEcheance({ dateLimite: e.date_limite, montantPrevu: e.montant_prevu, montantPaye }, aujourdhui)
      const reste = e.montant_prevu ? Math.max(0, Number(e.montant_prevu) - montantPaye) : null
      return { ...e, poste: parId[e.poste_id], montantPaye, reste, etat: etat !== 'payee' && montantPaye > 0 && etat === 'a_venir' ? 'partiel' : etat }
    })

  const echeancesMois = echeancesVue.filter((e) => e.periode === periode)
  const enRetard = echeancesVue.filter((e) => e.etat === 'en_retard')
  const bientot = echeancesVue.filter((e) => e.etat === 'bientot')

  const parGroupe = {}
  for (const d of duMois) {
    const g = parId[d.poste_id]?.groupe || 'autre'
    parGroupe[g] = (parGroupe[g] || 0) + Number(d.montant || 0)
  }

  const postesVue = postes.filter((p) => p.actif).map((p) => {
    const ceMois = somme(duMois.filter((d) => d.poste_id === p.id))
    const moisPrecedent = somme(duMoisAvant.filter((d) => d.poste_id === p.id))
    const echeance = echeancesMois.find((e) => e.poste_id === p.id) || null
    return {
      ...p,
      ce_mois: ceMois,
      mois_precedent: moisPrecedent,
      echeance,
      conseil: conseilPoste({ nom: p.nom, ce_mois: ceMois, mois_precedent: moisPrecedent, montant_habituel: p.montant_habituel }),
    }
  })

  return {
    periode,
    total: somme(duMois),
    totalAvant: somme(duMoisAvant),
    nombreDepenses: duMois.length,
    parGroupe,
    postesVue,
    echeancesVue,
    echeancesMois,
    resteAPayer: echeancesMois.filter((e) => e.etat !== 'payee').reduce((s, e) => s + Number(e.reste || 0), 0),
    sansMontant: echeancesMois.filter((e) => e.etat !== 'payee' && !e.montant_prevu).length,
    enRetard,
    bientot,
  }
}
