import { describe, expect, it } from 'vitest'
import {
  agentsHorsPaie, echeanceFacture, encours, etatFacture, margeMois, memeAgent, numeroDejaPris, prochainNumero, totalLignes,
} from '../src/lib/facturation.js'

const jour = (s) => new Date(s + 'T10:00:00')
const client = { id: 'c', delai_paiement: 45 }

describe('factures', () => {
  it('calcule l’échéance à 45 jours et l’état', () => {
    const f = { client_id: 'c', date_facture: '2026-09-15', montant: 1000, montant_paye: 0 }
    expect(echeanceFacture(f, client)).toBe('2026-10-30')
    expect(etatFacture(f, client, jour('2026-10-01'))).toBe('a_venir')
    expect(etatFacture(f, client, jour('2026-10-25'))).toBe('bientot')
    expect(etatFacture(f, client, jour('2026-11-02'))).toBe('en_retard')
    expect(etatFacture({ ...f, montant_paye: 1000 }, client, jour('2026-12-01'))).toBe('payee')
    expect(etatFacture({ ...f, montant_paye: 400 }, client, jour('2026-10-01'))).toBe('partielle')
  })
  it('totalise les lignes sans l’erreur 333 000 / 33 300', () => {
    expect(totalLignes([{ quantite: 4, prix: 33300 }, { quantite: 4, prix: 19800 }])).toBe(212400)
    expect(totalLignes([{ quantite: 0.5, prix: 46000 }])).toBe(23000)
  })
  it('donne un numéro unique pour toute l’année, maintenance comprise', () => {
    const fs = [{ numero: '128/09/2026' }, { numero: '123/09/2026 M' }, { numero: 'LOC/09/2026' }, { numero: '300/12/2025' }]
    expect(prochainNumero(fs, '2026-10-01')).toBe('129/10/2026')
    expect(numeroDejaPris(fs, '128/09/2026')).toBe(true)
    expect(numeroDejaPris(fs, '129/10/2026')).toBe(false)
  })
  it('compte ce que le client doit et ce qui est en retard', () => {
    const fs = [
      { client_id: 'c', date_facture: '2026-08-01', montant: 500, montant_paye: 0 },
      { client_id: 'c', date_facture: '2026-10-15', montant: 300, montant_paye: 100 },
      { client_id: 'c', date_facture: '2026-07-01', montant: 900, montant_paye: 900 },
    ]
    expect(encours(fs, [client], jour('2026-10-27'))).toMatchObject({ du: 700, retard: 500, nbRetard: 1 })
  })
})

describe('contrôle des agents (noms fictifs)', () => {
  it('reconnaît un agent malgré l’orthographe', () => {
    expect(memeAgent('KOMBERI TALIMOUNI Ari', 'KOMBERI TALIMOINI Ari')).toBe(true)
    expect(memeAgent('BOTANGA MALABA Irvin Marty', 'MALABA BOTANGA Irvan')).toBe(true)
    expect(memeAgent('NZOLA MOUKANDA Serge', 'NZOLA MOUTANGALA Fabrice')).toBe(false)
  })
  it('signale les agents facturés absents de la paie', () => {
    const factures = [{ lignes: [
      { agent: 'NZOLA MOUTANGALA Fabrice' }, { agent: 'NZOLA MOUKANDA Serge' }, { agent: 'MIKALONA Martin' },
      { agent: 'LIBALA Jean Bernard' }, { agent: 'MOREAUD Jean Jacques' }, { agent: '' },
    ] }]
    const paie = { agents: 'NZOLA MOUTANGALA Fabrice\nMIKALONA NGASSA\nMOREAUD Jean Jacques' }
    expect(agentsHorsPaie(factures, paie)).toEqual(['NZOLA MOUKANDA Serge', 'LIBALA Jean Bernard'])
  })
})

describe('marge', () => {
  it('retire la paie puis les frais du bureau, sans compter deux fois les salaires', () => {
    const postes = [{ id: 'l', nom: 'Loyer', groupe: 'bureau' }, { id: 's', nom: 'Salaires des agents', groupe: 'agents' }, { id: 'n', nom: 'CNSS', groupe: 'etat' }]
    const m = margeMois({
      periode: '2026-08-01',
      factures: [{ periode: '2026-08-01', montant: 12557448 }, { periode: '2026-07-01', montant: 1 }],
      paie: { brut: 5763442, indemnites: 823565, charges: 1601084 },
      depenses: [{ periode: '2026-08-01', poste_id: 'l', montant: 250000 }, { periode: '2026-08-01', poste_id: 's', montant: 5000000 }, { periode: '2026-08-01', poste_id: 'n', montant: 9 }],
      postes,
    })
    expect(m).toMatchObject({ facture: 12557448, coutPaie: 8188091, apresPaie: 4369357, taux: 35, frais: 250000, resultat: 4119357 })
  })
})

describe('prestataires payés sur facture', () => {
  it('ajoute leur coût à la paie du mois', () => {
    const m = margeMois({
      periode: '2026-08-01',
      factures: [{ periode: '2026-08-01', montant: 1000000 }],
      paie: { brut: 400000, indemnites: 0, charges: 100000 },
      bulletins: [{ periode: '2026-08-01', statut_emploi: 'prestataire', cout: 200000 }, { periode: '2026-08-01', statut_emploi: 'salarie', cout: 999 }],
    })
    expect(m.coutPaie).toBe(700000)
    expect(m.prestataires).toBe(200000)
  })

  it('ne les compte pas comme oubliés de la paie', () => {
    const factures = [{ lignes: [{ agent: 'Agent Alpha Un' }, { agent: 'Agent Beta Deux' }] }]
    expect(agentsHorsPaie(factures, { agents: 'Agent Alpha Un' }, ['Agent Beta Deux'])).toEqual([])
    expect(agentsHorsPaie(factures, { agents: 'Agent Alpha Un' })).toEqual(['Agent Beta Deux'])
  })
})
