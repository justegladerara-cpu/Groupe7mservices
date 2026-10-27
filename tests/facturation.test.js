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

describe('contrôle des agents', () => {
  it('reconnaît un agent malgré l’orthographe', () => {
    expect(memeAgent('MOKOURI MALIMOUNI Azi', 'MOKOURI MALIMOINI Azi')).toBe(true)
    expect(memeAgent('BAMANGA MAYALA Islend Marty', 'MAYALA BAMANGA Island')).toBe(true)
    expect(memeAgent('NKAYA MOUANDA Sorel', 'NKAYA MOUYANGALA Freddy')).toBe(false)
  })
  it('signale les agents facturés absents de la paie', () => {
    const factures = [{ lignes: [
      { agent: 'NKAYA MOUYANGALA Freddy' }, { agent: 'NKAYA MOUANDA Sorel' }, { agent: 'MIYAMONA Marvin' },
      { agent: 'LIBONGA Jean Benoit' }, { agent: 'MOINARD Jean Jacques' }, { agent: '' },
    ] }]
    const paie = { agents: 'NKAYA MOUYANGALA Freddy\nMIYAMONA NGANGA\nMOINARD Jean Jacques' }
    expect(agentsHorsPaie(factures, paie)).toEqual(['NKAYA MOUANDA Sorel', 'LIBONGA Jean Benoit'])
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
