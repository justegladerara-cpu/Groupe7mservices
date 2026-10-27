import { describe, expect, it } from 'vitest'
import {
  aEcheance, calculCnss, conseilPoste, controlesCnss, dateLimite, decalerPeriode, etatAutorisation,
  etatEcheance, etatMoisCnss, formatFcfa, periodeDe,
} from '../src/lib/regles.js'
import { construireVue } from '../src/lib/vue.js'

const jour = (s) => new Date(s + 'T10:00:00')

describe('périodes et dates limites', () => {
  it('décale les mois en passant les années', () => {
    expect(decalerPeriode('2026-12-01', 1)).toBe('2027-01-01')
    expect(decalerPeriode('2026-01-01', -1)).toBe('2025-12-01')
    expect(periodeDe('2026-10-27')).toBe('2026-10-01')
  })
  it('place la CNSS au 20 du mois suivant et ramène le 31 au dernier jour', () => {
    expect(dateLimite('2026-04-01', 20, 1)).toBe('2026-05-20')
    expect(dateLimite('2026-02-01', 31, 0)).toBe('2026-02-28')
  })
  it('sait quels postes ont une échéance', () => {
    const p = { actif: true, periodicite: 'trimestrielle', mois_reference: 1 }
    expect(aEcheance(p, '2026-04-01')).toBe(true)
    expect(aEcheance(p, '2026-05-01')).toBe(false)
    expect(aEcheance({ actif: true, periodicite: 'annuelle', mois_reference: 3 }, '2026-03-01')).toBe(true)
    expect(aEcheance({ actif: true, periodicite: 'ponctuelle' }, '2026-03-01')).toBe(false)
    expect(aEcheance({ actif: false, periodicite: 'mensuelle' }, '2026-03-01')).toBe(false)
  })
})

describe('échéances', () => {
  const auj = jour('2026-10-27')
  it('payée, en retard, bientôt, à venir', () => {
    expect(etatEcheance({ dateLimite: '2026-10-05', montantPrevu: 250000, montantPaye: 250000 }, auj)).toBe('payee')
    expect(etatEcheance({ dateLimite: '2026-10-05', montantPrevu: null, montantPaye: 1000 }, auj)).toBe('payee')
    expect(etatEcheance({ dateLimite: '2026-10-05', montantPrevu: 250000, montantPaye: 100000 }, auj)).toBe('en_retard')
    expect(etatEcheance({ dateLimite: '2026-10-30', montantPrevu: 1, montantPaye: 0 }, auj)).toBe('bientot')
    expect(etatEcheance({ dateLimite: '2026-11-20', montantPrevu: 1, montantPaye: 0 }, auj)).toBe('a_venir')
  })
})

describe('CNSS', () => {
  it('retrouve exactement le montant calculé par la CNSS (24,28 %)', () => {
    // Cas fictif : 1 000 000 de brut.
    const c = calculCnss(1000000)
    expect(c.total).toBe(242800)
    expect(c.pvid).toBe(120000)
    expect(c.pf).toBe(100300)
    expect(c.rp).toBe(22500)
    expect(c.partSalarie).toBe(40000)
    expect(c.partEmployeur).toBe(202800)
  })
  it('signale un mois non déclaré après la date limite', () => {
    const e = etatMoisCnss({ periode: '2026-05-01', declaration: null, paye: 0 }, jour('2026-10-27'))
    expect(e.etat).toBe('en_retard')
    expect(e.limite).toBe('2026-06-20')
  })
  it('déclaré en retard puis payé', () => {
    const e = etatMoisCnss({
      periode: '2026-04-01', declaration: { date_declaration: '2026-10-26', montant_declare: 500000 }, paye: 500000,
    }, jour('2026-10-27'))
    expect(e.etat).toBe('paye')
    expect(e.phrase).toMatch(/en retard/)
  })
  it('déclaré mais pas payé après la date limite', () => {
    const e = etatMoisCnss({
      periode: '2026-08-01', declaration: { date_declaration: '2026-09-10', montant_declare: 500000 }, paye: 0,
    }, jour('2026-10-27'))
    expect(e.etat).toBe('en_retard')
  })
  it('mois en cours à déclarer', () => {
    expect(etatMoisCnss({ periode: '2026-10-01', declaration: null, paye: 0 }, jour('2026-10-27')).etat).toBe('a_declarer')
  })
  it('repère un accusé sur le mauvais mois, un écart de montant et des agents non immatriculés', () => {
    const a = controlesCnss({ brut: 1000000, montant_declare: 200000, periode_accuse: '2026-01-01', non_immatricules: 2 }, '2026-04-01')
    expect(a).toHaveLength(3)
    expect(controlesCnss({ brut: 1000000, montant_declare: 242827, periode_accuse: '2026-04-01' }, '2026-04-01')).toHaveLength(0)
  })
})

describe('papiers', () => {
  const auj = jour('2026-10-27')
  it('expiré, bientôt, valide, permanent, à compléter', () => {
    expect(etatAutorisation({ date_fin: '2026-10-01' }, auj)).toBe('expiree')
    expect(etatAutorisation({ date_fin: '2026-11-15', rappel_jours: 60 }, auj)).toBe('bientot')
    expect(etatAutorisation({ date_fin: '2027-06-01', rappel_jours: 60 }, auj)).toBe('valide')
    expect(etatAutorisation({ date_debut: '2020-01-01' }, auj)).toBe('permanente')
    expect(etatAutorisation({}, auj)).toBe('a_completer')
  })
})

describe('conseils et affichage', () => {
  it('formate les francs CFA', () => {
    expect(formatFcfa(1682380)).toBe('1 682 380 FCFA')
    expect(formatFcfa(null)).toBe('—')
  })
  it('alerte sur une hausse ou une facture au-dessus de l’habitude', () => {
    expect(conseilPoste({ nom: 'Électricité', ce_mois: 92000, mois_precedent: 60000 }).ton).toBe('alerte')
    expect(conseilPoste({ nom: 'Électricité', ce_mois: 92000, mois_precedent: 90000, montant_habituel: 60000 }).texte).toMatch(/32 000 FCFA de plus/)
    expect(conseilPoste({ nom: 'Loyer', ce_mois: 250000, mois_precedent: 250000 }).ton).toBe('bien')
  })
})

describe('vue du mois', () => {
  it('additionne, répartit et calcule le reste à payer', () => {
    const postes = [
      { id: 'L', nom: 'Loyer', groupe: 'bureau', actif: true, ordre: 1, montant_habituel: 250000 },
      { id: 'C', nom: 'CNSS', groupe: 'etat', actif: true, ordre: 2, montant_habituel: 400000 },
    ]
    const depenses = [
      { poste_id: 'L', periode: '2026-10-01', date_paiement: '2026-10-04', montant: 250000 },
      { poste_id: 'C', periode: '2026-08-01', date_paiement: '2026-10-10', montant: 100000 },
      { poste_id: 'L', periode: '2026-09-01', date_paiement: '2026-09-04', montant: 250000 },
    ]
    const echeances = [
      { id: 1, poste_id: 'L', periode: '2026-10-01', date_limite: '2026-10-05', montant_prevu: 250000, ignoree: false },
      { id: 2, poste_id: 'C', periode: '2026-10-01', date_limite: '2026-11-20', montant_prevu: 400000, ignoree: false },
      { id: 3, poste_id: 'C', periode: '2026-08-01', date_limite: '2026-09-20', montant_prevu: 400000, ignoree: false },
    ]
    const v = construireVue({ postes, depenses, echeances, depensesPeriodes: depenses, periode: '2026-10-01', aujourdhui: jour('2026-10-27') })
    expect(v.total).toBe(350000)
    expect(v.totalAvant).toBe(250000)
    expect(v.parGroupe).toEqual({ bureau: 250000, etat: 100000 })
    expect(v.resteAPayer).toBe(400000)
    expect(v.enRetard.map((e) => e.id)).toEqual([3])
    expect(v.enRetard[0].reste).toBe(300000)
  })
})

import { debutSuiviCnss } from '../src/lib/regles.js'
describe('début du suivi CNSS', () => {
  it('part de la plus ancienne déclaration, sinon du mois dernier', () => {
    expect(debutSuiviCnss([{ periode: '2026-04-01' }, { periode: '2026-01-01' }])).toBe('2026-01-01')
    expect(debutSuiviCnss([], new Date('2026-10-27T10:00:00'))).toBe('2026-09-01')
  })
})
