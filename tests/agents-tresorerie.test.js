import { describe, expect, it } from 'vitest'
import { alertesAgent, coutUnitaire, margeAgent, prixPlancher, resumeAgents } from '../src/lib/agents.js'
import { prevision } from '../src/lib/tresorerie.js'

const auj = new Date('2026-10-27T10:00:00')

describe('agents', () => {
  const agent = { id: 'a', nom: 'Agent A', statut: 'actif', salaire_base: 260000, unite_facture: 'jour', prix_facture: 14000, matricule_cnss: '123', fin: '2026-11-10', client_id: 'c' }
  const client = { id: 'c', coefficient: 1.2 }

  it('calcule le coût, le plancher et la marge', () => {
    expect(coutUnitaire(agent)).toBe(12778) // 260 000 × 1,2778 / 26
    expect(prixPlancher(agent, client)).toBe(15334)
    expect(margeAgent(agent).parMois).toBe((14000 - 12778) * 26)
    expect(coutUnitaire({ ...agent, unite_facture: 'heure' })).toBe(Math.round(12777.8 / 8))
  })

  it('signale le prix sous la convention et la fin de contrat proche', () => {
    const a = alertesAgent(agent, client, auj)
    expect(a.map((x) => x.cle)).toEqual(['prix', 'fin'])
    expect(alertesAgent({ ...agent, prix_facture: 16000, fin: '2026-10-01', matricule_cnss: null }, client, auj).map((x) => x.cle)).toEqual(['fin', 'cnss'])
    expect(alertesAgent({ ...agent, statut: 'sorti' }, client, auj)).toEqual([])
  })

  it('résume l’équipe', () => {
    const r = resumeAgents([agent, { ...agent, id: 'b', statut: 'sorti' }], [client], auj)
    expect(r.actifs).toBe(1)
    expect(r.sousConvention).toBe(1)
    expect(r.finProche).toBe(1)
  })
})

describe('trésorerie prévue', () => {
  const clients = [{ id: 'c', delai_paiement: 45 }]
  const postes = [
    { id: 'p1', nom: 'Loyer', groupe: 'bureau', actif: true, periodicite: 'mensuelle', jour_echeance: 5, decalage_mois: 0, montant_habituel: 200000 },
    { id: 'p2', nom: 'Salaires des agents', groupe: 'agents', actif: true, periodicite: 'mensuelle', jour_echeance: 30, decalage_mois: 0, montant_habituel: 999 },
  ]
  const factures = [
    { id: 'f1', client_id: 'c', periode: '2026-08-01', date_facture: '2026-09-10', montant: 5000000, montant_paye: 0, numero: '1' },
    { id: 'f2', client_id: 'c', periode: '2026-09-01', date_facture: '2026-10-10', montant: 4000000, montant_paye: 0, numero: '2' },
  ]
  const paie = [{ periode: '2026-09-01', brut: 2000000, indemnites: 500000, charges: 600000 }]

  it('place les entrées et les sorties dans les bonnes semaines', () => {
    const r = prevision({ solde: 1000000, scenario: 'optimiste', semaines: 4, factures, clients, postes, paie, aujourdhui: auj })
    expect(r.lignes[0].debut).toBe('2026-10-26')
    // Facture 1 échue le 25/10 : attendue cette semaine. Salaires d'octobre le 30/10.
    expect(r.lignes[0].entrees).toBe(5000000)
    expect(r.lignes[0].sorties).toBe(2500000)
    // Loyer de novembre le 5/11 ; charges de la paie d'octobre le 20/11.
    expect(r.lignes[1].sorties).toBe(200000)
    expect(r.lignes[3].sorties).toBe(600000)
    expect(r.soldeFinal).toBe(1000000 + 5000000 - 2500000 - 200000 - 600000)
  })

  it('le scénario prudent retarde et réduit les encaissements', () => {
    const r = prevision({ solde: 0, scenario: 'prudent', semaines: 4, factures, clients, postes, paie, aujourdhui: auj })
    expect(r.lignes[0].entrees).toBe(0)
    expect(r.premiereNegative).toBe('2026-10-26')
  })
})
