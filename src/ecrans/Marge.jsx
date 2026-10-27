import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { decalerPeriode, formatFcfa, nomPeriode, nomPeriodeCourt, periodeDe } from '../lib/regles.js'
import { agentsHorsPaie, margeMois } from '../lib/facturation.js'
import { Anneau, Barre, EnteteXp, Tuile, Verdict, pluriel } from '../dream/communs.jsx'
import { Champ, ChampMontant, Erreur, Icone, Modale } from '../ui/kit.jsx'

export default function Marge({ donnees, periode, setPeriode, peutEcrire, recharger, choixMois, aller }) {
  const [saisie, setSaisie] = useState(false)
  const { factures, paie, postes, depensesPeriodes } = donnees
  const paieDe = (p) => paie.find((x) => x.periode === p) || null
  const calcul = (p) => margeMois({ periode: p, factures, paie: paieDe(p), depenses: depensesPeriodes, postes })
  const m = calcul(periode)
  const avant = calcul(decalerPeriode(periode, -1))
  const lignePaie = paieDe(periode)
  const horsPaie = agentsHorsPaie(factures.filter((f) => f.periode === periode), lignePaie)

  const ceMois = periodeDe(new Date())
  const historique = Array.from({ length: 12 }, (_, i) => decalerPeriode(ceMois, -i - 1)).map(calcul).filter((x) => x.facture || x.coutPaie)
  const cumul = historique.reduce((r, x) => ({ facture: r.facture + x.facture, apres: r.apres + (x.apresPaie ?? 0), mois: r.mois + (x.apresPaie === null ? 0 : 1) }), { facture: 0, apres: 0, mois: 0 })

  const tonTaux = m.taux === null ? 'neutre' : m.taux >= 30 ? 'bon' : m.taux >= 15 ? 'vigilance' : 'mauvais'
  const maxBarre = Math.max(1, m.facture, m.coutPaie || 0)

  return (
    <>
      <EnteteXp surtitre="Pilotage" titre="Marge du mois" sousTitre={`Ce que le travail de ${nomPeriode(periode)} a rapporté : facturé aux clients, moins la paie des agents, moins les frais du bureau.`}>
        {peutEcrire && <button className="bouton" onClick={() => setSaisie(true)}><Icone nom="membres" taille={16} />{lignePaie ? 'Modifier la paie du mois' : 'Saisir la paie du mois'}</button>}
        {choixMois}
      </EnteteXp>

      <section className="xp-carte xp-aujourdhui" aria-label="Marge du mois">
        <div className="xp-aujourdhui-grille">
          <Anneau part={m.taux === null ? 0 : Math.max(0, m.taux) / 100} libelle={`Marge de ${m.taux ?? 0} %`}>
            <strong>{m.taux === null ? '—' : `${m.taux} %`}</strong>
            <small className="texte-doux">gardé sur 100</small>
          </Anneau>
          <div className="xp-aujourdhui-chiffres">
            <span className="xp-surtitre">Reste après la paie</span>
            <span className="xp-gros-chiffre">{m.apresPaie === null ? '—' : formatFcfa(m.apresPaie)}</span>
            {m.apresPaie === null ? (
              <Verdict ton="vigilance">Paie de {nomPeriodeCourt(periode)} pas encore saisie</Verdict>
            ) : (
              <Verdict ton={tonTaux}>{m.taux >= 30 ? 'Bonne marge' : m.taux >= 15 ? 'Marge faible' : 'Marge insuffisante'}{avant.apresPaie !== null ? ` · ${nomPeriodeCourt(avant.periode)} : ${formatFcfa(avant.apresPaie)}` : ''}</Verdict>
            )}
            {m.resultat !== null && <small className="texte-doux">Après les frais du bureau ({formatFcfa(m.frais)}) : <b>{formatFcfa(m.resultat)}</b></small>}
          </div>
          <div className="xp-aujourdhui-courbe">
            <span className="xp-surtitre">D’où ça vient</span>
            <div className="xp-barres">
              <Barre libelle={`Facturé (${pluriel(m.nbFactures, 'facture', 'factures')})`} valeur={formatFcfa(m.facture)} part={m.facture / maxBarre} couleur="var(--accent)" />
              <Barre libelle={`Paie des agents${lignePaie?.effectif ? ` (${lignePaie.effectif})` : ''}`} valeur={m.coutPaie === null ? 'à saisir' : formatFcfa(m.coutPaie)} part={(m.coutPaie || 0) / maxBarre} couleur="var(--orange)"
                detail={lignePaie ? `Brut ${formatFcfa(lignePaie.brut)} · primes non imposables ${formatFcfa(lignePaie.indemnites)} · CNSS et TUS ${formatFcfa(lignePaie.charges)}` : null} />
              <Barre libelle="Frais du bureau (loyer, électricité…)" valeur={formatFcfa(m.frais)} part={m.frais / maxBarre} couleur="var(--texte-faible)" />
            </div>
          </div>
        </div>
      </section>

      <section className="xp-section">
        <h2 className="xp-section-titre">À regarder</h2>
        <div className="xp-grille large">
          {horsPaie.length > 0 && (
            <Tuile className="xp-reco mauvais" titre="Agents facturés absents de la paie" icone="membres" valeur={String(horsPaie.length)}
              verdict={{ ton: 'mauvais', texte: 'Risque CNSS' }}
              pourquoi={`${horsPaie.join(', ')} ${horsPaie.length > 1 ? 'sont facturés' : 'est facturé'} en ${nomPeriode(periode)} mais n’apparai${horsPaie.length > 1 ? 'ssent' : 't'} pas dans l’état des salaires. S’ils ne sont pas déclarés à la CNSS, c’est une pénalité possible.`}
              conseil="Ajouter ces agents à l’état des salaires et à la déclaration CNSS" onClick={() => aller('cnss')} />
          )}
          {!lignePaie && m.facture > 0 && (
            <Tuile className="xp-reco vigilance" titre="Paie du mois à saisir" icone="membres" verdict={{ ton: 'vigilance', texte: 'Manquant' }}
              pourquoi="Sans les totaux de la paie, la marge du mois ne peut pas être calculée. Quatre chiffres suffisent : brut, primes non imposables, CNSS et TUS de l’employeur."
              conseil={peutEcrire ? 'Saisir la paie' : null} onClick={peutEcrire ? () => setSaisie(true) : undefined} />
          )}
          {lignePaie?.note && (
            <Tuile className="xp-reco vigilance" titre="Note sur la paie" icone="alerte" verdict={{ ton: 'vigilance', texte: 'À vérifier' }} pourquoi={lignePaie.note} />
          )}
          {m.taux !== null && m.taux < 15 && (
            <Tuile className="xp-reco mauvais" titre="Marge trop faible" icone="graphique" verdict={{ ton: 'mauvais', texte: `${m.taux} %` }}
              pourquoi="La paie mange presque tout ce qui est facturé. Comparer les prix facturés avec la convention : certains agents sont facturés sous leur coût." />
          )}
          {horsPaie.length === 0 && lignePaie && m.taux >= 15 && !lignePaie.note && (
            <Tuile titre="Rien d’anormal" icone="coche" verdict={{ ton: 'bon', texte: 'OK' }} pourquoi="Chaque agent facturé est dans la paie, la marge est correcte." />
          )}
        </div>
      </section>

      <section className="xp-section">
        <h2 className="xp-section-titre">Mois par mois <small>{cumul.mois ? `${formatFcfa(cumul.apres)} gardés sur ${pluriel(cumul.mois, 'mois', 'mois')}, ${formatFcfa(Math.round(cumul.apres / cumul.mois))} en moyenne` : ''}</small></h2>
        <div className="xp-liste">
          {historique.map((x) => (
            <button key={x.periode} className="xp-ligne cliquable" aria-current={x.periode === periode ? 'true' : undefined} onClick={() => { setPeriode(x.periode); window.scrollTo(0, 0); document.querySelector('.contenu')?.scrollTo(0, 0) }}>
              <span className={`g7-puce-icone ${x.taux === null ? '' : x.taux >= 30 ? 'bon' : x.taux >= 15 ? 'vigilance' : 'mauvais'}`}><Icone nom="calendrier" taille={16} /></span>
              <span className="xp-ligne-texte">
                <strong style={{ textTransform: 'capitalize' }}>{nomPeriode(x.periode)}</strong>
                <small>Facturé {formatFcfa(x.facture)} · paie {x.coutPaie === null ? 'à saisir' : formatFcfa(x.coutPaie)}</small>
              </span>
              <span className="xp-ligne-valeur">
                {x.apresPaie === null ? '—' : formatFcfa(x.apresPaie)}
                <small>{x.taux === null ? '' : `${x.taux} %`}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="g7-note">Le facturé est rattaché au mois de travail (une facture émise en octobre pour septembre compte en septembre). Le coût de la paie = salaire brut + primes non imposables (transport, salissure, panier) + CNSS et TUS de l’employeur. Les avances sur salaire ne changent pas le coût.</p>
      </section>

      {saisie && <FichePaie periode={periode} ligne={lignePaie} fermer={() => setSaisie(false)} enregistre={() => { setSaisie(false); recharger() }} />}
    </>
  )
}

function FichePaie({ periode, ligne, fermer, enregistre }) {
  const [v, setV] = useState({
    effectif: ligne?.effectif ?? '', brut: ligne?.brut ?? '', indemnites: ligne?.indemnites ?? '', charges: ligne?.charges ?? '',
    agents: ligne?.agents ?? '', note: ligne?.note ?? '',
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const total = Number(v.brut || 0) + Number(v.indemnites || 0) + Number(v.charges || 0)

  async function enregistrer() {
    if (!v.brut) return setErreur('Indiquez au moins le total des salaires bruts.')
    setEnvoi(true)
    try {
      await api.enregistrerPaie({
        periode,
        effectif: v.effectif === '' ? null : Number(v.effectif),
        brut: Number(v.brut || 0), indemnites: Number(v.indemnites || 0), charges: Number(v.charges || 0),
        agents: v.agents.trim() || null, note: v.note || null,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  return (
    <Modale titre={`Paie de ${nomPeriode(periode)}`} fermer={fermer}
      pied={<button className="bouton principal" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>}>
      <p className="texte-doux petit">Les totaux de l’état des salaires du mois. Aucune fiche de paie détaillée n’est enregistrée.</p>
      <div className="g7-deux">
        <Champ libelle="Nombre d’agents payés">
          <input inputMode="numeric" value={v.effectif} onChange={(e) => setV({ ...v, effectif: e.target.value.replace(/\D/g, '') })} />
        </Champ>
        <Champ libelle="Total des salaires bruts"><ChampMontant valeur={v.brut} onChange={(x) => setV({ ...v, brut: x })} /></Champ>
      </div>
      <div className="g7-deux">
        <Champ libelle="Primes non imposables" aide="Transport, salissure, panier."><ChampMontant valeur={v.indemnites} onChange={(x) => setV({ ...v, indemnites: x })} /></Champ>
        <Champ libelle="Charges de l’employeur" aide="CNSS patronale + TUS."><ChampMontant valeur={v.charges} onChange={(x) => setV({ ...v, charges: x })} /></Champ>
      </div>
      <div className="g7-calcul"><span>Coût total de la paie : <b>{formatFcfa(total)}</b></span></div>
      <Champ libelle="Agents payés (un nom par ligne)" aide="Sert à repérer un agent facturé au client mais oublié dans la paie et la CNSS.">
        <textarea rows={6} value={v.agents} onChange={(e) => setV({ ...v, agents: e.target.value })} />
      </Champ>
      <Champ libelle="Note"><input value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Champ>
      <Erreur message={erreur} />
    </Modale>
  )
}
