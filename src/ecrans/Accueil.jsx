import { useState } from 'react'
import {
  GROUPES, debutSuiviCnss, decalerPeriode, etatAutorisation, etatMoisCnss, formatDate, formatFcfa, nomPeriode,
  nomPeriodeCourt, periodeDe, phraseAutorisation, variation,
} from '../lib/regles.js'
import { Anneau, Barre, EnteteXp, Tuile, Verdict, pluriel } from '../dream/communs.jsx'
import { iconePoste } from '../ui/kit.jsx'
import { encours, etatFacture, margeMois } from '../lib/facturation.js'

// Mois CNSS à surveiller : les 6 derniers mois terminés.
export function alertesCnss(donnees, aujourdhui = new Date()) {
  const ceMois = periodeDe(aujourdhui)
  const posteCnss = donnees.postes.find((p) => p.nom === 'CNSS')
  const r = []
  for (let i = 1; i <= 6; i++) {
    const p = decalerPeriode(ceMois, -i)
    if (p < debutSuiviCnss(donnees.cnss, aujourdhui)) break
    const declaration = donnees.cnss.find((c) => c.periode === p)
    const paye = donnees.depensesPeriodes
      .filter((d) => d.poste_id === posteCnss?.id && d.periode === p)
      .reduce((s, d) => s + Number(d.montant), 0)
    const e = etatMoisCnss({ periode: p, declaration, paye, jourLimite: posteCnss?.jour_echeance || 20 }, aujourdhui)
    if (e.etat === 'en_retard') r.push({ periode: p, ...e })
  }
  return r
}

const TON_CONSEIL = { alerte: 'mauvais', bien: 'bon', neutre: 'neutre' }

export default function Accueil({ vue, donnees, periode, aller, voirPoste, ouvrirSaisie, peutEcrire, choixMois, membre }) {
  const [tout, setTout] = useState(false)
  const v = variation(vue.total, vue.totalAvant)
  const papiers = donnees.autorisations.filter((a) => ['expiree', 'bientot'].includes(etatAutorisation(a)))
  const papiersExpires = papiers.filter((a) => etatAutorisation(a) === 'expiree').length
  const cnssRetard = alertesCnss(donnees)
  const montantRetard = vue.enRetard.reduce((s, e) => s + Number(e.reste || 0), 0)
  const avant = nomPeriodeCourt(decalerPeriode(periode, -1))
  const heure = new Date().getHours()
  const nbRetards = vue.enRetard.length + cnssRetard.length

  const echeances = vue.echeancesMois
  const payees = echeances.filter((e) => e.etat === 'payee').length
  const part = echeances.length ? payees / echeances.length : 0

  const groupes = Object.entries(vue.parGroupe).sort((a, b) => b[1] - a[1])
  const postes = [...vue.postesVue].sort((a, b) => b.ce_mois - a.ce_mois || a.ordre - b.ordre)
  const actifs = postes.filter((p) => p.ce_mois > 0 || p.echeance)
  const visibles = tout ? postes : actifs

  const payer = (e) => (peutEcrire ? () => ouvrirSaisie({ poste_id: e.poste_id, periode: e.periode, montant: e.reste || '' }) : () => aller('echeances'))
  const aFaire = [
    ...cnssRetard.map((c) => ({
      cle: `cnss-${c.periode}`, ton: 'mauvais', icone: 'badge', titre: `CNSS de ${nomPeriode(c.periode)}`, texte: c.phrase,
      action: () => aller('cnss'), conseil: 'Ouvrir la CNSS',
    })),
    ...vue.enRetard.map((e) => ({
      cle: e.id, ton: 'mauvais', icone: iconePoste(e.poste), titre: `${e.poste.nom} · ${nomPeriode(e.periode)}`,
      valeur: e.reste ? formatFcfa(e.reste) : null,
      texte: `Devait être payé le ${formatDate(e.date_limite)}.`, action: payer(e), conseil: peutEcrire ? 'Enregistrer le paiement' : 'Voir',
    })),
    ...papiers.filter((a) => etatAutorisation(a) === 'expiree').map((a) => ({
      cle: a.id, ton: 'mauvais', icone: 'dossier', titre: a.nom, texte: phraseAutorisation(a), action: () => aller('papiers'), conseil: 'Renouveler',
    })),
    ...vue.bientot.map((e) => ({
      cle: e.id, ton: 'vigilance', icone: iconePoste(e.poste), titre: `${e.poste.nom} · ${nomPeriode(e.periode)}`,
      valeur: e.reste ? formatFcfa(e.reste) : null,
      texte: `À payer avant le ${formatDate(e.date_limite)}.`, action: payer(e), conseil: peutEcrire ? 'Enregistrer le paiement' : 'Voir',
    })),
    ...papiers.filter((a) => etatAutorisation(a) === 'bientot').map((a) => ({
      cle: a.id, ton: 'vigilance', icone: 'dossier', titre: a.nom, texte: phraseAutorisation(a), action: () => aller('papiers'), conseil: 'Préparer le renouvellement',
    })),
  ]

  // Côté recettes : ce que les clients doivent, et la marge du dernier mois dont la paie est saisie.
  const clientsParId = Object.fromEntries(donnees.clients.map((c) => [c.id, c]))
  const du = encours(donnees.factures, donnees.clients)
  const facturesRetard = donnees.factures.filter((f) => etatFacture(f, clientsParId[f.client_id]) === 'en_retard')
  const dernierePaie = donnees.paie.find((x) => donnees.factures.some((f) => f.periode === x.periode))
  const marge = dernierePaie ? margeMois({ periode: dernierePaie.periode, factures: donnees.factures, paie: dernierePaie, depenses: donnees.depensesPeriodes, postes: donnees.postes, bulletins: donnees.bulletins }) : null
  if (facturesRetard.length) {
    aFaire.unshift({
      cle: 'factures-retard', ton: 'mauvais', icone: 'facture', titre: `${facturesRetard.length > 1 ? `${facturesRetard.length} factures clients` : 'Une facture client'} en retard`,
      valeur: formatFcfa(du.retard), texte: 'Le client a dépassé le délai de paiement : le relancer.', action: () => aller('factures'), conseil: 'Voir les factures',
    })
  }

  const verdictTotal = v === null
    ? { ton: 'neutre', texte: `${pluriel(vue.nombreDepenses, 'dépense enregistrée', 'dépenses enregistrées')}` }
    : v > 10 ? { ton: 'mauvais', texte: `+${v} % par rapport à ${avant}` }
      : v < -10 ? { ton: 'bon', texte: `${v} % par rapport à ${avant}` }
        : { ton: 'neutre', texte: `Stable par rapport à ${avant}` }

  return (
    <>
      <EnteteXp
        surtitre="Groupe7M services"
        titre={`${heure >= 18 || heure < 5 ? 'Bonsoir' : 'Bonjour'} ${membre?.nom || ''}`.trim()}
        sousTitre={`Où est passé l'argent de la société en ${nomPeriode(periode)}, ce qui reste à payer et ce qui doit être renouvelé.`}
      >
        {choixMois}
      </EnteteXp>

      <section className="xp-carte xp-aujourdhui" aria-label="Le mois en un coup d'œil">
        <div className="xp-aujourdhui-grille">
          <Anneau part={part} libelle={`${payees} échéances payées sur ${echeances.length}`}>
            <strong>{echeances.length ? `${Math.round(part * 100)} %` : '—'}</strong>
            <small className="texte-doux">{payees}/{echeances.length} payées</small>
          </Anneau>
          <div className="xp-aujourdhui-chiffres">
            <span className="xp-surtitre">Sorti en {nomPeriodeCourt(periode)}</span>
            <span className="xp-gros-chiffre">{formatFcfa(vue.total)}</span>
            <Verdict ton={verdictTotal.ton}>{verdictTotal.texte}</Verdict>
            <small className="texte-doux">
              {vue.resteAPayer > 0 ? `Reste ${formatFcfa(vue.resteAPayer)} à payer ce mois.` : echeances.length ? 'Toutes les échéances du mois sont réglées.' : 'Aucune échéance ce mois.'}
            </small>
          </div>
          <div className="xp-aujourdhui-courbe">
            <span className="xp-surtitre">Où va l'argent</span>
            {vue.total === 0 ? <p className="texte-doux">Aucune dépense enregistrée ce mois-ci.</p> : (
              <div className="xp-barres">
                {groupes.map(([g, m]) => (
                  <Barre key={g} libelle={GROUPES[g]?.nom} valeur={formatFcfa(m)} part={m / vue.total} couleur={GROUPES[g]?.couleur}
                    detail={`${Math.round((m / vue.total) * 100)} % du total`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="xp-section">
        <h2 className="xp-section-titre">
          À regarder maintenant
          {aFaire.length > 3 && <button className="lien" onClick={() => aller('echeances')}>Tout voir ({aFaire.length})</button>}
        </h2>
        {aFaire.length === 0 ? (
          <div className="xp-grille">
            <Tuile titre="Tout est en ordre" icone="coche" verdict={{ ton: 'bon', texte: 'À jour' }}
              pourquoi="Rien en retard, aucun papier à renouveler. Bonne gestion." />
          </div>
        ) : (
          <div className="xp-grille large">
            {aFaire.slice(0, 3).map((a) => (
              <Tuile key={a.cle} className={`xp-reco ${a.ton}`} titre={a.titre} icone={a.icone} valeur={a.valeur}
                verdict={{ ton: a.ton, texte: a.ton === 'mauvais' ? 'En retard' : 'Bientôt' }}
                pourquoi={a.texte} conseil={a.conseil} onClick={a.action} />
            ))}
          </div>
        )}
      </section>

      <section className="xp-section">
        <h2 className="xp-section-titre">Les chiffres</h2>
        <div className="xp-grille">
          <Tuile titre="Les clients doivent" icone="billet" valeur={formatFcfa(du.du)}
            verdict={du.retard ? { ton: 'mauvais', texte: 'Retard' } : du.du ? { ton: 'neutre', texte: 'Dans les délais' } : { ton: 'bon', texte: 'Tout encaissé' }}
            pourquoi={du.retard ? `Dont ${formatFcfa(du.retard)} en retard.` : 'Factures envoyées pas encore payées.'}
            conseil="Voir les factures" onClick={() => aller('factures')} />
          {marge && (
            <Tuile titre={`Marge de ${nomPeriodeCourt(marge.periode)}`} icone="graphique" valeur={formatFcfa(marge.apresPaie)}
              verdict={{ ton: marge.taux >= 30 ? 'bon' : marge.taux >= 15 ? 'vigilance' : 'mauvais', texte: `${marge.taux} %` }}
              pourquoi={`Facturé ${formatFcfa(marge.facture)}, paie ${formatFcfa(marge.coutPaie)}.`}
              conseil="Voir la marge" onClick={() => aller('marge')} />
          )}
          <Tuile titre="Reste à payer ce mois" icone="echeance" valeur={formatFcfa(vue.resteAPayer)}
            verdict={vue.resteAPayer === 0 ? { ton: 'bon', texte: 'Réglé' } : null}
            pourquoi={vue.sansMontant > 0
              ? `Plus ${pluriel(vue.sansMontant, 'échéance', 'échéances')} sans montant habituel.`
              : `${pluriel(echeances.length - payees, 'échéance ouverte', 'échéances ouvertes')} sur ${echeances.length}.`}
            conseil="Voir les échéances" onClick={() => aller('echeances')} />
          <Tuile titre="En retard" icone="alerte" valeur={String(nbRetards)}
            verdict={nbRetards ? { ton: 'mauvais', texte: 'À régler' } : { ton: 'bon', texte: 'À jour' }}
            pourquoi={nbRetards === 0 ? 'Tous les paiements et déclarations sont à jour.' : montantRetard ? `${formatFcfa(montantRetard)} en attente, des pénalités peuvent tomber.` : 'Paiements ou déclarations en attente.'}
            conseil={nbRetards ? 'Régler les retards' : null} onClick={() => aller('echeances')} />
          <Tuile titre="Papiers à renouveler" icone="dossier" valeur={String(papiers.length)}
            verdict={papiersExpires ? { ton: 'mauvais', texte: `${papiersExpires} expiré${papiersExpires > 1 ? 's' : ''}` } : papiers.length ? { ton: 'vigilance', texte: 'Bientôt' } : { ton: 'bon', texte: 'Valides' }}
            pourquoi={papiers.length ? 'Un client ou un contrôle peut les demander à tout moment.' : 'Agrément, assurances et attestations sont valides.'}
            conseil="Voir les papiers" onClick={() => aller('papiers')} />
          <Tuile titre="Dépenses du mois" icone="depenses" valeur={String(vue.nombreDepenses)}
            pourquoi={v === null ? `Comparaison avec ${avant} dès qu'il y aura des chiffres.` : `${formatFcfa(vue.totalAvant)} en ${avant}.`}
            conseil="Voir le détail" onClick={() => aller('depenses')} />
        </div>
      </section>

      <section className="xp-section">
        <h2 className="xp-section-titre">
          Poste par poste
          <button className="lien" onClick={() => setTout(!tout)}>{tout ? 'Masquer les postes vides' : `Voir tous les postes (${postes.length})`}</button>
        </h2>
        {visibles.length === 0 ? <p className="texte-doux">Aucun poste actif ce mois-ci.</p> : (
          <div className="xp-grille">
            {visibles.map((p) => {
              const vp = variation(p.ce_mois, p.mois_precedent)
              const etat = p.echeance?.etat
              const verdict = etat === 'payee' ? { ton: 'bon', texte: 'Payé' }
                : etat === 'en_retard' ? { ton: 'mauvais', texte: 'En retard' }
                  : etat === 'bientot' ? { ton: 'vigilance', texte: 'Bientôt dû' }
                    : etat === 'partiel' ? { ton: 'vigilance', texte: 'Payé en partie' }
                      : etat === 'a_venir' ? { ton: 'neutre', texte: 'À venir' } : null
              return (
                <Tuile key={p.id} titre={p.nom} icone={iconePoste(p)} valeur={formatFcfa(p.ce_mois)} verdict={verdict}
                  pourquoi={vp === null ? (p.mois_precedent ? null : `${avant} : rien`) : `${vp > 0 ? '+' : ''}${vp} % · ${avant} ${formatFcfa(p.mois_precedent)}`}
                  onClick={() => voirPoste(p.id)}>
                  <span className={`g7-detail ${TON_CONSEIL[p.conseil.ton] || ''}`}>{p.conseil.texte}</span>
                </Tuile>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
