import { useState } from 'react'
import { formatDate, formatFcfa } from '../lib/regles.js'
import { SCENARIOS, prevision } from '../lib/tresorerie.js'
import { EnteteXp, Segments, Tuile } from '../dream/communs.jsx'
import { Champ, ChampMontant, Icone } from '../ui/kit.jsx'

const CLE_SOLDE = 'g7-solde-depart'
function lireSolde() {
  try { return localStorage.getItem(CLE_SOLDE) || '' } catch { return '' }
}

// Inspiré de la trésorerie prévue de The Dream : semaine par semaine, trois scénarios.
// Adapté à G7 : un client qui paie à 45 jours, une grosse paie chaque mois.
export default function Tresorerie({ donnees }) {
  const [solde, setSolde] = useState(lireSolde)
  const [semaines, setSemaines] = useState('12')
  const [scenario, setScenario] = useState('central')
  const [ouverte, setOuverte] = useState(null)
  const base = { solde: Number(solde || 0), semaines: Number(semaines), factures: donnees.factures, clients: donnees.clients, postes: donnees.postes, paie: donnees.paie, depensesPeriodes: donnees.depensesPeriodes }
  const r = Object.fromEntries(Object.keys(SCENARIOS).map((k) => [k, prevision({ ...base, scenario: k })]))
  const p = r[scenario]
  const maxAbs = Math.max(1, ...p.lignes.map((l) => Math.max(l.entrees, l.sorties)))

  const changerSolde = (x) => {
    setSolde(x)
    try { localStorage.setItem(CLE_SOLDE, x) } catch { /* rien */ }
  }

  return (
    <>
      <EnteteXp surtitre="Pilotage" titre="Trésorerie prévue" sousTitre="Ce qui devrait entrer et sortir, semaine par semaine. Une estimation pour voir venir les semaines difficiles, pas un engagement." />

      <div className="g7-filtre g7-tresor-reglages">
        <Champ libelle="Argent disponible aujourd’hui" aide="Banque + caisse + Mobile Money.">
          <ChampMontant valeur={solde} onChange={changerSolde} />
        </Champ>
        <Champ libelle="Sur">
          <select value={semaines} onChange={(e) => setSemaines(e.target.value)}>
            {[4, 8, 12, 26].map((n) => <option key={n} value={n}>{n} semaines</option>)}
          </select>
        </Champ>
      </div>

      <div className="xp-grille">
        {Object.entries(SCENARIOS).map(([k, s]) => {
          const x = r[k]
          return (
            <Tuile key={k} className={x.premiereNegative ? 'xp-reco mauvais' : ''} titre={`${s.nom} : dans ${semaines} semaines`} icone="graphique" valeur={formatFcfa(x.soldeFinal)}
              verdict={x.premiereNegative ? { ton: 'mauvais', texte: `Manque dès le ${formatDate(x.premiereNegative)}` } : { ton: 'bon', texte: `Au plus bas ${formatFcfa(x.minimum)}` }}
              pourquoi={k === 'prudent' ? 'Le client paie 30 jours en retard, 10 % ne rentre pas à temps, 15 % de travail en moins.' : k === 'central' ? 'Le client paie avec 10 jours de retard, comme d’habitude.' : 'Le client paie à l’heure, un peu plus de travail.'}
              conseil={scenario === k ? null : 'Voir ce scénario'} onClick={() => setScenario(k)} />
          )
        })}
      </div>

      <section className="xp-section">
        <h2 className="xp-section-titre">
          <span>Semaine par semaine</span>
          <Segments libelle="Scénario" valeur={scenario} onChange={setScenario} options={Object.entries(SCENARIOS).map(([k, s]) => [k, s.nom])} />
        </h2>
        <div className="xp-liste">
          {p.lignes.map((l) => (
            <button key={l.debut} className="xp-ligne cliquable" onClick={() => setOuverte(ouverte === l.debut ? null : l.debut)} aria-expanded={ouverte === l.debut}>
              <span className={`g7-puce-icone ${l.solde < 0 ? 'mauvais' : l.entrees - l.sorties < 0 ? 'vigilance' : 'bon'}`}><Icone nom="calendrier" taille={16} /></span>
              <span className="xp-ligne-texte">
                <strong>Semaine du {formatDate(l.debut)}</strong>
                <span className="g7-tresor-barres" aria-hidden="true">
                  <span className="entree" style={{ width: `${(l.entrees / maxAbs) * 100}%` }} />
                  <span className="sortie" style={{ width: `${(l.sorties / maxAbs) * 100}%` }} />
                </span>
                <small>Entrées {formatFcfa(l.entrees)} · sorties {formatFcfa(l.sorties)}</small>
                {ouverte === l.debut && l.detail.length > 0 && (
                  <span className="g7-tresor-detail">
                    {l.detail.map((d, i) => (
                      <span key={i}><span>{d.libelle}{d.type === 'estime' ? '' : ''}</span><b className={d.montant < 0 ? 'texte-erreur' : 'texte-ok'}>{d.montant > 0 ? '+' : '−'}{formatFcfa(Math.abs(d.montant))}</b></span>
                    ))}
                  </span>
                )}
              </span>
              <span className="xp-ligne-valeur">
                <span className={l.solde < 0 ? 'texte-erreur' : ''}>{formatFcfa(l.solde)}</span>
                <small>en fin de semaine</small>
              </span>
            </button>
          ))}
        </div>
        <p className="g7-note">Comptés : les factures pas encore payées (à leur échéance), le travail des mois pas encore facturés (moyenne des 3 derniers mois, payé {donnees.clients[0]?.delai_paiement ?? 45} jours après la facture), la paie (moyenne des derniers mois : salaires en fin de mois, CNSS et TUS le 20 du mois suivant) et les frais habituels du bureau. Les avances sur salaire et les dépenses imprévues ne sont pas comptées.</p>
      </section>
    </>
  )
}
