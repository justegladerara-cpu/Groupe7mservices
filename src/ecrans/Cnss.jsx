import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import {
  calculCnss, controlesCnss, debutSuiviCnss, dateIso, decalerPeriode, etatMoisCnss, formatDate, formatFcfa, formatNombre,
  nomPeriode, periodeDe,
} from '../lib/regles.js'
import { BoutonDocument, Champ, ChampDocument, ChampMontant, Fenetre, Pastille } from '../ui/kit.jsx'

const LIBELLES = { paye: 'Payé', declare: 'Déclaré', en_retard: 'En retard', a_declarer: 'À déclarer', pas_encore: '—' }

export default function Cnss({ donnees, peutEcrire, recharger, ouvrirSaisie }) {
  const [ouvert, setOuvert] = useState(null)
  const ceMois = periodeDe(new Date())
  const poste = donnees.postes.find((p) => p.nom === 'CNSS')
  const jourLimite = poste?.jour_echeance || 20

  const debut = debutSuiviCnss(donnees.cnss)
  const mois = Array.from({ length: 12 }, (_, i) => decalerPeriode(ceMois, -i)).filter((p) => p >= debut).map((p) => {
    const declaration = donnees.cnss.find((c) => c.periode === p) || null
    const paye = donnees.depensesPeriodes.filter((d) => d.poste_id === poste?.id && d.periode === p)
      .reduce((s, d) => s + Number(d.montant), 0)
    return { periode: p, declaration, paye, ...etatMoisCnss({ periode: p, declaration, paye, jourLimite }), alertes: controlesCnss(declaration, p) }
  })

  const totalDeclare = mois.reduce((s, m) => s + Number(m.declaration?.montant_declare || 0), 0)
  const totalPaye = mois.reduce((s, m) => s + m.paye, 0)
  const retards = mois.filter((m) => m.etat === 'en_retard').length

  return (
    <div className="pile">
      <section className="grille-chiffres">
        <div className={`chiffre ${retards ? 'chiffre-rouge' : 'chiffre-vert'}`}>
          <div className="chiffre-titre">Mois en retard</div>
          <div className="chiffre-valeur">{retards}</div>
          <div className="chiffre-detail">{retards ? 'Chaque mois de retard peut coûter des majorations.' : 'Toutes les déclarations sont à jour.'}</div>
        </div>
        <div className="chiffre">
          <div className="chiffre-titre">Déclaré sur 12 mois</div>
          <div className="chiffre-valeur">{formatFcfa(totalDeclare)}</div>
          <div className="chiffre-detail">Payé : {formatFcfa(totalPaye)}</div>
        </div>
        <div className="chiffre">
          <div className="chiffre-titre">Reste dû</div>
          <div className="chiffre-valeur">{formatFcfa(Math.max(0, totalDeclare - totalPaye))}</div>
          <div className="chiffre-detail">À payer le {jourLimite} du mois suivant</div>
        </div>
      </section>

      <div className="grille-mois">
        {mois.map((m) => (
          <button key={m.periode} className={`tuile-mois bord-${m.etat}`} onClick={() => setOuvert(m)} disabled={m.etat === 'pas_encore'}>
            <div className="tuile-tete">
              <span className="tuile-nom">{nomPeriode(m.periode)}</span>
              <Pastille etat={m.etat} texte={LIBELLES[m.etat]} />
            </div>
            {m.declaration?.montant_declare ? (
              <div className="tuile-montant">{formatFcfa(m.declaration.montant_declare)}</div>
            ) : <div className="tuile-montant texte-doux">—</div>}
            <div className="tuile-conseil">{m.phrase}</div>
            {m.declaration?.assures ? <div className="petit texte-doux">{m.declaration.assures} assurés · brut {formatFcfa(m.declaration.brut)}</div> : null}
            {m.alertes.length > 0 && <div className="petit texte-rouge">⚠ {m.alertes.length} point(s) à vérifier</div>}
          </button>
        ))}
      </div>

      <p className="texte-doux petit">Le suivi commence en {nomPeriode(debut)}, mois de la plus ancienne déclaration saisie. </p>
      {peutEcrire && (
        <button className="bouton bouton-secondaire" onClick={() => {
          const p = decalerPeriode(debut, -1)
          setOuvert({ periode: p, declaration: null, paye: 0, alertes: [], ...etatMoisCnss({ periode: p, declaration: null, paye: 0, jourLimite }) })
        }}>+ Saisir {nomPeriode(decalerPeriode(debut, -1))}</button>
      )}
      <p className="texte-doux petit">Taux utilisés : 24,28 % du brut (pensions 12 %, prestations familiales 10,03 %, risques professionnels 2,25 %), comme sur les accusés de la CNSS. Date limite réglable dans Réglages › CNSS (le {jourLimite} du mois suivant par défaut, à confirmer avec le comptable).</p>

      {ouvert && (
        <FicheMois
          m={ouvert}
          peutEcrire={peutEcrire}
          fermer={() => setOuvert(null)}
          enregistre={() => { setOuvert(null); recharger() }}
          payer={() => { setOuvert(null); ouvrirSaisie({ poste_id: poste?.id, periode: ouvert.periode, montant: Math.max(0, Number(ouvert.declaration?.montant_declare || 0) - ouvert.paye) || '' }) }}
        />
      )}
    </div>
  )
}

function FicheMois({ m, peutEcrire, fermer, enregistre, payer }) {
  const d = m.declaration || {}
  const [assures, setAssures] = useState(d.assures ?? '')
  const [nonImm, setNonImm] = useState(d.non_immatricules ?? 0)
  const [brut, setBrut] = useState(d.brut ?? '')
  const [declare, setDeclare] = useState(d.montant_declare ?? '')
  const [dateDecl, setDateDecl] = useState(d.date_declaration || '')
  const [periodeAccuse, setPeriodeAccuse] = useState(d.periode_accuse || m.periode)
  const [note, setNote] = useState(d.note || '')
  const [fichier, setFichier] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const calcul = brut ? calculCnss(brut) : null
  const brouillon = { brut, montant_declare: declare, periode_accuse: periodeAccuse, non_immatricules: Number(nonImm || 0) }
  const alertes = controlesCnss(brouillon, m.periode)
  const choixAccuse = Array.from({ length: 13 }, (_, i) => decalerPeriode(m.periode, 6 - i))

  async function enregistrer() {
    setEnvoi(true)
    setErreur('')
    try {
      const accuse_path = fichier ? await api.envoyerDocument(`cnss/${m.periode.slice(0, 7)}`, fichier) : d.accuse_path || null
      await api.enregistrerCnss({
        periode: m.periode,
        assures: assures === '' ? null : Number(assures),
        non_immatricules: Number(nonImm || 0),
        brut: brut === '' ? null : brut,
        montant_declare: declare === '' ? null : declare,
        date_declaration: dateDecl || null,
        periode_accuse: periodeAccuse || null,
        accuse_path,
        note: note || null,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  return (
    <Fenetre
      titre={`CNSS · ${nomPeriode(m.periode)}`}
      fermer={fermer}
      pied={peutEcrire && (
        <>
          {d.montant_declare > m.paye && <button className="bouton bouton-secondaire" onClick={payer} disabled={envoi}>Enregistrer un paiement</button>}
          <button className="bouton" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      <p><Pastille etat={m.etat} texte={LIBELLES[m.etat]} /> {m.phrase} <span className="texte-doux">Date limite : {formatDate(m.limite)}.</span></p>
      <p className="texte-doux petit">Payé pour ce mois : {formatFcfa(m.paye)}.</p>
      <fieldset disabled={!peutEcrire}>
        <div className="deux-colonnes">
          <Champ label="Nombre d'assurés">
            <input inputMode="numeric" value={assures} onChange={(e) => setAssures(e.target.value.replace(/\D/g, ''))} />
          </Champ>
          <Champ label="Agents sans numéro CNSS">
            <input inputMode="numeric" value={nonImm} onChange={(e) => setNonImm(e.target.value.replace(/\D/g, ''))} />
          </Champ>
        </div>
        <Champ label="Total des salaires bruts">
          <ChampMontant valeur={brut} onChange={setBrut} />
        </Champ>
        {calcul && (
          <div className="calcul">
            <div>Cotisation attendue : <b>{formatFcfa(calcul.total)}</b></div>
            <div className="petit texte-doux">
              Pensions {formatNombre(calcul.pvid)} · Prestations familiales {formatNombre(calcul.pf)} · Risques pro {formatNombre(calcul.rp)}
              {' · '}dont {formatNombre(calcul.partSalarie)} retenus aux agents et {formatNombre(calcul.partEmployeur)} à la charge de la société
            </div>
            {peutEcrire && Number(declare) !== calcul.total && (
              <button type="button" className="lien" onClick={() => setDeclare(calcul.total)}>Reporter ce montant comme déclaré</button>
            )}
          </div>
        )}
        <Champ label="Montant déclaré (sur l'accusé)">
          <ChampMontant valeur={declare} onChange={setDeclare} />
        </Champ>
        <div className="deux-colonnes">
          <Champ label="Déclaré le">
            <input type="date" value={dateDecl} max={dateIso(new Date())} onChange={(e) => setDateDecl(e.target.value)} />
          </Champ>
          <Champ label="Mois écrit sur l'accusé" aide="Pour repérer une déclaration enregistrée sur le mauvais mois.">
            <select value={periodeAccuse} onChange={(e) => setPeriodeAccuse(e.target.value)}>
              {choixAccuse.map((p) => <option key={p} value={p}>{nomPeriode(p)}</option>)}
            </select>
          </Champ>
        </div>
        <Champ label="Accusé de réception">
          <ChampDocument fichier={fichier} setFichier={setFichier} cheminExistant={d.accuse_path} />
        </Champ>
        <Champ label="Note">
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </Champ>
      </fieldset>
      {!peutEcrire && d.accuse_path && <BoutonDocument chemin={d.accuse_path} texte="Voir l'accusé" />}
      {alertes.length > 0 && (
        <ul className="alertes-liste">{alertes.map((a) => <li key={a}>⚠ {a}</li>)}</ul>
      )}
      {erreur && <p className="texte-erreur">{erreur}</p>}
    </Fenetre>
  )
}
