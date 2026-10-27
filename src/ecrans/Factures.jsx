import { useMemo, useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { dateIso, decalerPeriode, formatDate, formatFcfa, formatNombre, joursAvant, nomPeriode, periodeDe } from '../lib/regles.js'
import {
  TYPES_FACTURE, UNITES, echeanceFacture, encours, etatFacture, numeroDejaPris, prochainNumero, resteFacture, totalLignes,
} from '../lib/facturation.js'
import { EnteteXp, Segments, Tuile, pluriel } from '../dream/communs.jsx'
import { BoutonDocument, Champ, ChampDocument, ChampMontant, Erreur, Icone, Modale, Vide } from '../ui/kit.jsx'

const LIBELLE = { payee: 'Payée', partielle: 'Acompte reçu', en_retard: 'En retard', bientot: 'Bientôt due', a_venir: 'À encaisser' }
const TON = { payee: 'bon', partielle: 'vigilance', en_retard: 'mauvais', bientot: 'vigilance', a_venir: 'neutre' }
const ORDRE = { en_retard: 0, bientot: 1, partielle: 2, a_venir: 3, payee: 4 }

export default function Factures({ donnees, periode, peutEcrire, estGerant, recharger, choixMois }) {
  const [filtre, setFiltre] = useState('ouvertes')
  const [ouverte, setOuverte] = useState(null)
  const { clients, factures } = donnees
  const parClient = Object.fromEntries(clients.map((c) => [c.id, c]))
  const total = encours(factures, clients)

  const liste = useMemo(() => factures.map((f) => ({ ...f, etat: etatFacture(f, parClient[f.client_id]), echeance: echeanceFacture(f, parClient[f.client_id]) })), [factures, clients]) // eslint-disable-line react-hooks/exhaustive-deps
  const visibles = liste
    .filter((f) => (filtre === 'ouvertes' ? f.etat !== 'payee' : filtre === 'retard' ? f.etat === 'en_retard' : filtre === 'mois' ? f.periode === periode : true))
    .sort((a, b) => (filtre === 'ouvertes' || filtre === 'retard' ? ORDRE[a.etat] - ORDRE[b.etat] || a.echeance.localeCompare(b.echeance) : b.date_facture.localeCompare(a.date_facture) || b.numero.localeCompare(a.numero)))

  const duMois = liste.filter((f) => f.periode === periode)
  const factureMois = duMois.reduce((s, f) => s + Number(f.montant), 0)
  const aCorriger = liste.filter((f) => /renum|à vérifier/i.test(f.note || ''))
  const parType = Object.entries(duMois.reduce((r, f) => ({ ...r, [f.type]: (r[f.type] || 0) + Number(f.montant) }), {}))

  return (
    <>
      <EnteteXp surtitre="Argent" titre="Factures clients" sousTitre="Ce que les clients doivent, quand ils doivent payer, et ce qui est en retard. Les numéros sont donnés par le site : plus de doublons.">
        {peutEcrire && <button className="bouton principal" onClick={() => setOuverte({})}><Icone nom="plus" taille={16} />Nouvelle facture</button>}
      </EnteteXp>

      <div className="xp-grille">
        <Tuile titre="Les clients doivent encore" icone="billet" valeur={formatFcfa(total.du)}
          verdict={total.du ? { ton: total.retard ? 'mauvais' : 'neutre', texte: total.retard ? 'Retard' : 'Dans les délais' } : { ton: 'bon', texte: 'Tout encaissé' }}
          pourquoi={total.du ? `${pluriel(liste.filter((f) => f.etat !== 'payee').length, 'facture ouverte', 'factures ouvertes')}.` : 'Toutes les factures sont payées.'}
          conseil={total.du ? 'Voir les factures ouvertes' : null} onClick={() => setFiltre('ouvertes')} />
        <Tuile titre="En retard de paiement" icone="alerte" valeur={formatFcfa(total.retard)}
          verdict={total.nbRetard ? { ton: 'mauvais', texte: pluriel(total.nbRetard, 'facture', 'factures') } : { ton: 'bon', texte: 'Aucune' }}
          pourquoi={total.nbRetard ? `Échéance dépassée depuis le ${formatDate(total.plusVieux)} : relancer le client.` : 'Aucun client en retard.'}
          conseil={total.nbRetard ? 'Voir les retards' : null} onClick={() => setFiltre('retard')} />
        <Tuile titre={`Facturé pour ${nomPeriode(periode)}`} icone="facture" valeur={formatFcfa(factureMois)}
          pourquoi={duMois.length ? parType.map(([t, m]) => `${TYPES_FACTURE[t]} ${formatFcfa(m)}`).join(' · ') : 'Aucune facture pour ce mois de travail.'}
          conseil="Voir ce mois" onClick={() => setFiltre('mois')} />
        {aCorriger.length > 0 && (
          <Tuile titre="Factures à vérifier" icone="document" valeur={String(aCorriger.length)} className="xp-reco vigilance"
            verdict={{ ton: 'vigilance', texte: 'À corriger' }}
            pourquoi="Numéros en double ou dates incohérentes repris de l’ancien registre. Le détail est sur chaque facture." />
        )}
      </div>

      <section className="xp-section">
        <h2 className="xp-section-titre">
          <span>Les factures <small>{pluriel(visibles.length, 'facture', 'factures')}</small></span>
          <span className="g7-boutons">
            <Segments libelle="Filtrer" valeur={filtre} onChange={setFiltre}
              options={[['ouvertes', 'À encaisser'], ['retard', 'En retard'], ['mois', 'Mois choisi'], ['toutes', 'Toutes']]} />
            {filtre === 'mois' && choixMois}
          </span>
        </h2>
        {visibles.length === 0 ? <Vide titre="Aucune facture ici." texte={filtre === 'retard' ? 'Aucun client en retard.' : null} /> : (
          <div className="xp-liste">
            {visibles.map((f) => {
              const j = joursAvant(f.echeance)
              return (
                <button key={f.id} className="xp-ligne cliquable" onClick={() => setOuverte(f)}>
                  <span className={`g7-puce-icone ${TON[f.etat]}`}><Icone nom={f.type === 'maintenance' ? 'horloge' : f.type === 'location' ? 'camion' : 'facture'} taille={16} /></span>
                  <span className="xp-ligne-texte">
                    <strong>N° {f.numero} · {parClient[f.client_id]?.nom}</strong>
                    <small>
                      Travail de {nomPeriode(f.periode)} · émise le {formatDate(f.date_facture)}
                      {f.etat !== 'payee' && ` · ${j < 0 ? `en retard de ${pluriel(-j, 'jour')}` : j === 0 ? "due aujourd'hui" : `due dans ${pluriel(j, 'jour')}`}`}
                    </small>
                    <span className="g7-actions">
                      <span className={`xp-verdict ${TON[f.etat]}`}>{LIBELLE[f.etat]}</span>
                      <span className="texte-doux petit">{TYPES_FACTURE[f.type]}</span>
                      {f.note && <span className="g7-detail vigilance petit">{f.note}</span>}
                    </span>
                  </span>
                  <span className="xp-ligne-valeur">
                    {formatFcfa(f.montant)}
                    {f.etat !== 'payee' && Number(f.montant_paye) > 0 && <small>reste {formatFcfa(resteFacture(f))}</small>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {ouverte && (
        <FicheFacture f={ouverte} donnees={donnees} periode={periode} peutEcrire={peutEcrire} estGerant={estGerant}
          fermer={() => setOuverte(null)} enregistre={() => { setOuverte(null); recharger() }} />
      )}
    </>
  )
}

const ligneVide = (unite = 'jour') => ({ agent: '', qualification: '', unite, quantite: '', prix: '' })

function FicheFacture({ f, donnees, periode, peutEcrire, estGerant, fermer, enregistre }) {
  const { clients, factures } = donnees
  const nouvelle = !f.id
  const ceMois = periodeDe(new Date())
  const periodeDefaut = f.periode || (periode < ceMois ? periode : decalerPeriode(ceMois, -1))
  const [v, setV] = useState({
    client_id: f.client_id || clients[0]?.id || '',
    numero: f.numero || prochainNumero(factures, periodeDefaut),
    periode: periodeDefaut,
    date_facture: f.date_facture || dateIso(new Date()),
    type: f.type || 'journalier',
    site: f.site || '',
    note: f.note || '',
  })
  const [lignes, setLignes] = useState(() => (f.lignes?.length ? f.lignes : nouvelle ? [ligneVide()] : []))
  const [montantManuel, setMontantManuel] = useState(f.montant ?? '')
  const [paye, setPaye] = useState(f.montant_paye ?? 0)
  const [datePaiement, setDatePaiement] = useState(f.date_paiement || '')
  const [fichier, setFichier] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const maj = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const lignesUtiles = lignes.filter((l) => l.agent || l.qualification || Number(l.quantite) || Number(l.prix))
  const avecLignes = lignesUtiles.length > 0
  const montant = avecLignes ? totalLignes(lignesUtiles) : Number(montantManuel || 0)
  const doublon = numeroDejaPris(factures, v.numero, f.id)
  const client = clients.find((c) => c.id === v.client_id)
  const choixPeriodes = Array.from({ length: 13 }, (_, i) => decalerPeriode(ceMois, -i))
  if (!choixPeriodes.includes(v.periode)) choixPeriodes.push(v.periode)

  const majLigne = (i, k, val) => setLignes(lignes.map((l, j) => (j === i ? { ...l, [k]: val } : l)))

  async function enregistrer() {
    if (!v.client_id) return setErreur('Choisissez le client.')
    if (!v.numero.trim()) return setErreur('Indiquez le numéro de la facture.')
    if (doublon) return setErreur('Ce numéro existe déjà : prenez le suivant.')
    if (!montant) return setErreur('La facture est à 0 FCFA : ajoutez les jours ou les heures.')
    if (Number(paye) > montant) return setErreur('Le montant reçu dépasse le montant de la facture.')
    setEnvoi(true)
    setErreur('')
    try {
      const document_path = fichier ? await api.envoyerDocument(`factures/${v.periode.slice(0, 7)}`, fichier) : f.document_path || null
      await api.enregistrerFacture({
        ...(f.id ? { id: f.id } : {}),
        ...v,
        numero: v.numero.trim(),
        site: v.site || null,
        note: v.note || null,
        lignes: lignesUtiles.map((l) => ({ ...l, quantite: Number(l.quantite || 0), prix: Number(l.prix || 0) })),
        montant,
        montant_paye: Number(paye || 0),
        date_paiement: Number(paye || 0) > 0 ? datePaiement || dateIso(new Date()) : null,
        document_path,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer la facture n° ${f.numero} ?`)) return
    try {
      await api.supprimerFacture(f.id)
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
    }
  }

  return (
    <Modale large titre={nouvelle ? 'Nouvelle facture' : `Facture n° ${f.numero}`} fermer={fermer}
      pied={peutEcrire && (
        <>
          {estGerant && !nouvelle && <button className="bouton danger" onClick={supprimer} disabled={envoi}>Supprimer</button>}
          <button className="bouton principal" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}>
      <fieldset className="g7-champs" disabled={!peutEcrire}>
        <div className="g7-deux">
          <Champ libelle="Client">
            <select value={v.client_id} onChange={maj('client_id')}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Champ>
          <Champ libelle="Numéro" aide={doublon ? null : 'Proposé par le site : une seule suite pour toutes les factures.'}>
            <input value={v.numero} onChange={maj('numero')} aria-invalid={doublon} />
          </Champ>
        </div>
        {doublon && <Erreur message="Ce numéro est déjà utilisé par une autre facture." />}
        <div className="g7-deux">
          <Champ libelle="Mois de travail facturé">
            <select value={v.periode} onChange={(e) => setV({ ...v, periode: e.target.value, numero: nouvelle ? prochainNumero(factures, e.target.value) : v.numero })}>
              {choixPeriodes.map((p) => <option key={p} value={p}>{nomPeriode(p)}</option>)}
            </select>
          </Champ>
          <Champ libelle="Date de la facture" aide={v.date_facture ? `Le client doit payer avant le ${formatDate(echeanceFacture(v, client))} (${client?.delai_paiement ?? 45} jours).` : null}>
            <input type="date" value={v.date_facture} onChange={maj('date_facture')} />
          </Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Type">
            <select value={v.type} onChange={(e) => {
              const type = e.target.value
              setV({ ...v, type })
              if (!lignesUtiles.length) setLignes([ligneVide(type === 'maintenance' ? 'heure' : 'jour')])
            }}>
              {Object.entries(TYPES_FACTURE).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </Champ>
          <Champ libelle="Site ou centre de coût"><input value={v.site} onChange={maj('site')} placeholder="Ex. : C136 BASE YA SIKA ONSHORE" /></Champ>
        </div>

        <div className="g7-lignes">
          <div className="g7-lignes-tete"><span>Agent</span><span>Qualification</span><span>Unité</span><span>Quantité</span><span>Prix</span><span>Total</span><span /></div>
          {lignes.map((l, i) => (
            <div key={i} className="g7-lignes-ligne">
              <input aria-label="Agent" placeholder="Nom de l’agent" value={l.agent} onChange={(e) => majLigne(i, 'agent', e.target.value)} />
              <input aria-label="Qualification" placeholder="Électricien…" value={l.qualification} onChange={(e) => majLigne(i, 'qualification', e.target.value)} />
              <select aria-label="Unité" value={l.unite} onChange={(e) => majLigne(i, 'unite', e.target.value)}>
                {Object.keys(UNITES).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input aria-label="Quantité" inputMode="decimal" placeholder="0" value={l.quantite} onChange={(e) => majLigne(i, 'quantite', e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))} />
              <input aria-label="Prix unitaire" inputMode="numeric" placeholder="0" value={l.prix === '' ? '' : formatNombre(l.prix)} onChange={(e) => majLigne(i, 'prix', e.target.value.replace(/\D/g, ''))} />
              <strong>{formatNombre(Number(l.quantite || 0) * Number(l.prix || 0))}</strong>
              <button type="button" className="icone-bouton" aria-label="Retirer la ligne" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}><Icone nom="fermer" taille={14} /></button>
            </div>
          ))}
          <button type="button" className="lien" onClick={() => setLignes([...lignes, ligneVide(v.type === 'maintenance' ? 'heure' : 'jour')])}><Icone nom="plus" taille={14} />Ajouter une ligne (agent, heures sup., transport…)</button>
        </div>

        {avecLignes ? (
          <div className="g7-calcul"><span>Total de la facture, calculé : <b>{formatFcfa(montant)}</b></span><small>Quantité × prix pour chaque ligne : plus d’erreur de recopie.</small></div>
        ) : (
          <Champ libelle="Montant de la facture" aide="Sans lignes, saisissez le total.">
            <ChampMontant valeur={montantManuel} onChange={setMontantManuel} />
          </Champ>
        )}

        <div className="g7-deux">
          <Champ libelle="Montant reçu du client">
            <ChampMontant valeur={paye} onChange={setPaye} />
          </Champ>
          <Champ libelle="Reçu le">
            <input type="date" value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
          </Champ>
        </div>
        {peutEcrire && Number(paye) < montant && (
          <div className="g7-boutons">
            <button type="button" className="bouton" onClick={() => { setPaye(montant); if (!datePaiement) setDatePaiement(dateIso(new Date())) }}>
              <Icone nom="coche" taille={16} />Le client a tout payé
            </button>
          </div>
        )}
        <Champ libelle="Copie de la facture"><ChampDocument fichier={fichier} setFichier={setFichier} cheminExistant={f.document_path} /></Champ>
        <Champ libelle="Note"><input value={v.note} onChange={maj('note')} /></Champ>
      </fieldset>
      {!peutEcrire && <BoutonDocument chemin={f.document_path} />}
      <Erreur message={erreur} />
    </Modale>
  )
}
