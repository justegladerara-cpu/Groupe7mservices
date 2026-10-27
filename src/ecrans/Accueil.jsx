import { useState } from 'react'
import {
  GROUPES, debutSuiviCnss, decalerPeriode, etatAutorisation, etatMoisCnss, formatDate, formatFcfa, nomPeriode,
  nomPeriodeCourt, periodeDe, phraseAutorisation, variation,
} from '../lib/regles.js'
import { Pastille } from '../ui/kit.jsx'

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

export default function Accueil({ vue, donnees, periode, aller, voirPoste, ouvrirSaisie, peutEcrire }) {
  const [tout, setTout] = useState(false)
  const v = variation(vue.total, vue.totalAvant)
  const papiers = donnees.autorisations.filter((a) => ['expiree', 'bientot'].includes(etatAutorisation(a)))
  const cnssRetard = alertesCnss(donnees)
  const montantRetard = vue.enRetard.reduce((s, e) => s + Number(e.reste || 0), 0)
  const avant = nomPeriodeCourt(decalerPeriode(periode, -1))

  const groupes = Object.entries(vue.parGroupe).sort((a, b) => b[1] - a[1])
  const postes = [...vue.postesVue].sort((a, b) => b.ce_mois - a.ce_mois || a.ordre - b.ordre)
  const actifs = postes.filter((p) => p.ce_mois > 0 || p.echeance)
  const visibles = tout ? postes : actifs

  const aFaire = [
    ...cnssRetard.map((c) => ({ cle: `cnss-${c.periode}`, ton: 'rouge', titre: `CNSS de ${nomPeriode(c.periode)}`, texte: c.phrase, action: () => aller('cnss') })),
    ...vue.enRetard.map((e) => ({
      cle: e.id, ton: 'rouge', titre: `${e.poste.nom} · ${nomPeriode(e.periode)}`,
      texte: `Devait être payé le ${formatDate(e.date_limite)}.${e.reste ? ` Reste ${formatFcfa(e.reste)}.` : ''}`,
      action: peutEcrire ? () => ouvrirSaisie({ poste_id: e.poste_id, periode: e.periode, montant: e.reste || '' }) : null,
      libelle: 'Payer',
    })),
    ...vue.bientot.map((e) => ({
      cle: e.id, ton: 'orange', titre: `${e.poste.nom} · ${nomPeriode(e.periode)}`,
      texte: `À payer avant le ${formatDate(e.date_limite)}.${e.reste ? ` ${formatFcfa(e.reste)}.` : ''}`,
      action: peutEcrire ? () => ouvrirSaisie({ poste_id: e.poste_id, periode: e.periode, montant: e.reste || '' }) : null,
      libelle: 'Payer',
    })),
    ...papiers.map((a) => ({
      cle: a.id, ton: etatAutorisation(a) === 'expiree' ? 'rouge' : 'orange', titre: a.nom,
      texte: phraseAutorisation(a), action: () => aller('papiers'),
    })),
  ]

  return (
    <div className="pile">
      <section className="grille-chiffres">
        <div className="chiffre chiffre-principal">
          <div className="chiffre-titre">Sorti en {nomPeriodeCourt(periode)}</div>
          <div className="chiffre-valeur">{formatFcfa(vue.total)}</div>
          <div className="chiffre-detail">
            {v === null ? `${vue.nombreDepenses} dépense(s) enregistrée(s)` :
              <span className={v > 10 ? 'texte-rouge' : v < -10 ? 'texte-vert' : ''}>
                {v > 0 ? '▲' : v < 0 ? '▼' : '='} {Math.abs(v)} % par rapport à {avant} ({formatFcfa(vue.totalAvant)})
              </span>}
          </div>
        </div>
        <button className="chiffre" onClick={() => aller('echeances')}>
          <div className="chiffre-titre">Reste à payer ce mois</div>
          <div className="chiffre-valeur">{formatFcfa(vue.resteAPayer)}</div>
          <div className="chiffre-detail">
            {vue.sansMontant > 0 ? `+ ${vue.sansMontant} échéance(s) sans montant habituel` : `${vue.echeancesMois.filter((e) => e.etat !== 'payee').length} échéance(s) ouvertes`}
          </div>
        </button>
        <button className={`chiffre ${vue.enRetard.length + cnssRetard.length ? 'chiffre-rouge' : 'chiffre-vert'}`} onClick={() => aller('echeances')}>
          <div className="chiffre-titre">En retard</div>
          <div className="chiffre-valeur">{vue.enRetard.length + cnssRetard.length}</div>
          <div className="chiffre-detail">{vue.enRetard.length + cnssRetard.length === 0 ? 'Tout est à jour.' : montantRetard ? `${formatFcfa(montantRetard)} en attente` : 'Paiements ou déclarations en attente'}</div>
        </button>
        <button className={`chiffre ${papiers.length ? 'chiffre-orange' : 'chiffre-vert'}`} onClick={() => aller('papiers')}>
          <div className="chiffre-titre">Papiers à renouveler</div>
          <div className="chiffre-valeur">{papiers.length}</div>
          <div className="chiffre-detail">{papiers.length ? 'Expirés ou bientôt expirés' : 'Tous valides.'}</div>
        </button>
      </section>

      <section className="carte">
        <h2>Où va l'argent en {nomPeriodeCourt(periode)}</h2>
        {vue.total === 0 ? <p className="texte-doux">Aucune dépense enregistrée ce mois-ci.</p> : (
          <>
            <div className="barre-repartition" role="img" aria-label="Répartition des dépenses">
              {groupes.map(([g, m]) => (
                <span key={g} style={{ width: `${(m / vue.total) * 100}%`, background: GROUPES[g]?.couleur }} title={`${GROUPES[g]?.nom} : ${formatFcfa(m)}`} />
              ))}
            </div>
            <ul className="legende">
              {groupes.map(([g, m]) => (
                <li key={g}>
                  <span className="puce" style={{ background: GROUPES[g]?.couleur }} />
                  <span className="legende-nom">{GROUPES[g]?.nom}</span>
                  <span className="legende-montant">{formatFcfa(m)}</span>
                  <span className="legende-part">{Math.round((m / vue.total) * 100)} %</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="carte">
        <h2>À faire</h2>
        {aFaire.length === 0 ? <p className="texte-vert">✓ Rien en retard, rien à renouveler. Bonne gestion.</p> : (
          <ul className="liste-a-faire">
            {aFaire.slice(0, 8).map((a) => (
              <li key={a.cle} className={`a-faire a-faire-${a.ton}`}>
                <div>
                  <div className="a-faire-titre">{a.titre}</div>
                  <div className="a-faire-texte">{a.texte}</div>
                </div>
                {a.action && <button className="bouton bouton-petit" onClick={a.action}>{a.libelle || 'Voir'}</button>}
              </li>
            ))}
            {aFaire.length > 8 && <li className="texte-doux">… et {aFaire.length - 8} autre(s).</li>}
          </ul>
        )}
      </section>

      <section>
        <div className="titre-section">
          <h2>Poste par poste</h2>
          <button className="lien" onClick={() => setTout(!tout)}>{tout ? 'Masquer les postes vides' : `Voir tous les postes (${postes.length})`}</button>
        </div>
        <div className="grille-postes">
          {visibles.map((p) => {
            const vp = variation(p.ce_mois, p.mois_precedent)
            return (
              <button key={p.id} className="tuile-poste" onClick={() => voirPoste(p.id)}>
                <div className="tuile-tete">
                  <span className="tuile-icone" aria-hidden>{p.icone}</span>
                  <span className="tuile-nom">{p.nom}</span>
                  {p.echeance && <Pastille etat={p.echeance.etat} />}
                </div>
                <div className="tuile-montant">{formatFcfa(p.ce_mois)}</div>
                <div className="tuile-compare">
                  {vp === null ? (p.mois_precedent ? '' : `${avant} : —`) : `${vp > 0 ? '▲' : vp < 0 ? '▼' : '='} ${Math.abs(vp)} % · ${avant} ${formatFcfa(p.mois_precedent)}`}
                </div>
                <div className={`tuile-conseil ton-${p.conseil.ton}`}>{p.conseil.texte}</div>
              </button>
            )
          })}
          {visibles.length === 0 && <p className="texte-doux">Aucun poste actif ce mois-ci.</p>}
        </div>
      </section>
    </div>
  )
}
