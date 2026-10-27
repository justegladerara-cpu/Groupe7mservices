import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { GROUPES, dateIso, decalerPeriode, nomPeriode, periodeDe } from '../lib/regles.js'
import { Champ, ChampDocument, ChampMontant, Erreur, Icone, Modale, iconePoste } from '../ui/kit.jsx'

export const MODES = {
  especes: 'Espèces',
  virement: 'Virement',
  cheque: 'Chèque',
  mobile_money: 'Mobile money',
  autre: 'Autre',
}

// Saisie d'une dépense en 3 gestes : le poste, le montant, la photo du reçu.
export default function NouvelleDepense({ postes, pre, fermer, enregistre }) {
  const aujourdhui = dateIso(new Date())
  const periodePour = (p) => decalerPeriode(periodeDe(new Date()), -(p?.decalage_mois || 0))
  const posteInitial = postes.find((p) => p.id === pre.poste_id) || null

  const [poste, setPoste] = useState(posteInitial)
  const [montant, setMontant] = useState(pre.montant ?? posteInitial?.montant_habituel ?? '')
  const [periode, setPeriode] = useState(pre.periode || periodePour(posteInitial))
  const [date, setDate] = useState(aujourdhui)
  const [mode, setMode] = useState('especes')
  const [beneficiaire, setBeneficiaire] = useState(posteInitial?.beneficiaire || '')
  const [note, setNote] = useState('')
  const [fichier, setFichier] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const choisir = (p) => {
    setPoste(p)
    if (!pre.montant) setMontant(p.montant_habituel ?? '')
    if (!pre.periode) setPeriode(periodePour(p))
    setBeneficiaire(p.beneficiaire || '')
  }

  const choixPeriodes = Array.from({ length: 13 }, (_, i) => decalerPeriode(periodeDe(new Date()), -i))
  if (!choixPeriodes.includes(periode)) choixPeriodes.push(periode)

  async function enregistrer() {
    if (!poste) return setErreur('Choisissez un poste.')
    if (!montant || montant <= 0) return setErreur('Indiquez le montant payé.')
    setEnvoi(true)
    setErreur('')
    try {
      const recu_path = fichier ? await api.envoyerDocument(`recus/${periode.slice(0, 7)}`, fichier) : null
      await api.ajouterDepense({
        poste_id: poste.id, periode, date_paiement: date, montant, mode_paiement: mode,
        beneficiaire: beneficiaire || null, note: note || null, recu_path,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  if (!poste) {
    const parGroupe = Object.keys(GROUPES).map((g) => [g, postes.filter((p) => p.groupe === g)]).filter(([, l]) => l.length)
    return (
      <Modale titre="Nouvelle dépense : quel poste ?" fermer={fermer} large>
        {parGroupe.map(([g, liste]) => (
          <div key={g} className="g7-choix-groupe">
            <span>{GROUPES[g].nom}</span>
            <div className="g7-choix">
              {liste.map((p) => (
                <button key={p.id} className="choix-poste" onClick={() => choisir(p)}>
                  <span className="g7-puce-icone"><Icone nom={iconePoste(p)} taille={15} /></span>{p.nom}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Modale>
    )
  }

  return (
    <Modale
      titre={poste.nom}
      fermer={fermer}
      pied={
        <>
          <button className="bouton" onClick={() => setPoste(null)} disabled={envoi}>Changer de poste</button>
          <button className="bouton principal" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      }
    >
      {poste.aide && <p className="texte-doux">{poste.aide}</p>}
      <Champ libelle="Montant payé">
        <ChampMontant valeur={montant} onChange={setMontant} autoFocus grand />
      </Champ>
      <Champ libelle="Reçu ou facture" aide="Photo prise avec le téléphone ou fichier PDF. Il reste attaché à la dépense comme preuve.">
        <ChampDocument fichier={fichier} setFichier={setFichier} />
      </Champ>
      <div className="g7-deux">
        <Champ libelle="Payé le">
          <input type="date" value={date} max={aujourdhui} onChange={(e) => setDate(e.target.value)} />
        </Champ>
        <Champ libelle="Pour quel mois ?" aide={poste.decalage_mois ? 'Ex. : la CNSS payée en novembre concerne octobre.' : null}>
          <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
            {choixPeriodes.map((p) => <option key={p} value={p}>{nomPeriode(p)}</option>)}
          </select>
        </Champ>
      </div>
      <div className="g7-deux">
        <Champ libelle="Payé comment ?">
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Champ>
        <Champ libelle="Payé à">
          <input value={beneficiaire} onChange={(e) => setBeneficiaire(e.target.value)} placeholder="Ex. : E2C, propriétaire…" />
        </Champ>
      </div>
      <Champ libelle="Note (facultatif)">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : facture n° 1234" />
      </Champ>
      <Erreur message={erreur} />
    </Modale>
  )
}
