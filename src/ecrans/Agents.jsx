import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { formatDate, formatFcfa, joursAvant, nomPeriode } from '../lib/regles.js'
import { STATUTS_EMPLOI, TYPES_CONTRAT, UNITES_FACTURE, alertesAgent, coutEstReel, coutUnitaire, historiqueAgent, margeAgent, prixPlancher, resumeAgents } from '../lib/agents.js'
import { EnteteXp, Segments, Tuile, pluriel } from '../dream/communs.jsx'
import { Avatar, Champ, ChampMontant, Erreur, Icone, Modale, Vide } from '../ui/kit.jsx'

// Inspiré des fiches employés de The Dream, adapté à la mise à disposition : où l'agent est placé, ce qu'il coûte, ce qu'il rapporte.
export default function Agents({ donnees, peutEcrire, estGerant, recharger }) {
  const [filtre, setFiltre] = useState('alertes')
  const [ouvert, setOuvert] = useState(null)
  const { agents, clients } = donnees

  if (agents === null) {
    return (
      <>
        <EnteteXp surtitre="Personnel" titre="Agents placés" sousTitre="Chaque agent, le client où il travaille, son contrat, ce qu’il coûte et ce qu’il rapporte." />
        <Vide titre="La liste des agents n’est pas encore installée dans la base."
          texte="Il manque une étape technique dans la base de données de Groupe7M. Dès qu’elle est faite, cet écran fonctionne sans rien changer d’autre." />
      </>
    )
  }

  const { bulletins = [], factures } = donnees
  const parClient = Object.fromEntries(clients.map((c) => [c.id, c]))
  const r = resumeAgents(agents, clients, new Date(), bulletins, factures)
  const lignes = r.avecAlertes
    .concat(agents.filter((a) => a.statut === 'sorti').map((agent) => ({ agent, alertes: [] })))
    .sort((x, y) => graviteDe(y.alertes) - graviteDe(x.alertes) || x.agent.nom.localeCompare(y.agent.nom))
  const filtrer = (f) => lignes.filter(({ agent, alertes }) => (
    f === 'alertes' ? alertes.some((al) => al.ton === 'mauvais')
      : f === 'salaries' ? agent.statut !== 'sorti' && agent.statut_emploi !== 'prestataire'
        : f === 'prestataires' ? agent.statut !== 'sorti' && agent.statut_emploi === 'prestataire'
          : f === 'sortis' ? agent.statut === 'sorti'
            : agent.statut !== 'sorti'
  ))
  const filtreEffectif = filtre === 'alertes' && filtrer('alertes').length === 0 ? 'actifs' : filtre
  const liste = filtrer(filtreEffectif)
  const mois = r.duMois.filter((x) => x.facture && x.cout)
  const gagne = mois.reduce((s, x) => s + x.marge, 0)
  const nomMois = r.dernierMois ? nomPeriode(r.dernierMois) : ''

  return (
    <>
      <EnteteXp surtitre="Personnel" titre="Agents placés" sousTitre="Chaque agent : chez quel client, ce qu’il coûte vraiment (bulletins de paie), ce qui est facturé pour lui, et ce qu’il rapporte.">
        {peutEcrire && <button className="bouton principal" onClick={() => setOuvert({})}><Icone nom="plus" taille={16} />Nouvel agent</button>}
      </EnteteXp>

      <div className="xp-grille">
        <Tuile titre="Agents en poste" icone="membres" valeur={String(r.actifs)}
          pourquoi={`${pluriel(r.actifs - r.prestataires, 'salarié')} et ${pluriel(r.prestataires, 'prestataire')} payé${r.prestataires > 1 ? 's' : ''} sur facture.`}
          conseil={agents.length ? 'Voir tous les agents' : null} onClick={() => setFiltre('actifs')} />
        {mois.length > 0 && (
          <Tuile titre={`Rapporté en ${nomMois}`} icone="graphique" valeur={formatFcfa(gagne)}
            verdict={{ ton: gagne > 0 ? 'bon' : 'mauvais', texte: `${pluriel(mois.length, 'agent')} comparé${mois.length > 1 ? 's' : ''}` }}
            pourquoi={`Facturé pour ces agents moins ce qu’ils ont coûté (bulletins de ${nomMois}).`} />
        )}
        <Tuile className={r.pertes ? 'xp-reco mauvais' : ''} titre="Coûtent plus qu’ils ne rapportent" icone="alerte" valeur={String(r.pertes)}
          verdict={r.pertes ? { ton: 'mauvais', texte: 'À renégocier' } : { ton: 'bon', texte: 'Aucun' }}
          pourquoi={r.pertes ? 'Le prix facturé au client est plus bas que le coût réel du dernier bulletin (salaire, primes, indemnités et charges).' : 'Chaque prix facturé couvre le coût réel de l’agent.'}
          conseil={r.pertes ? 'Voir ces agents' : null} onClick={() => setFiltre('alertes')} />
        <Tuile className={r.prestataires ? 'xp-reco vigilance' : ''} titre="Payés sans bulletin" icone="badge" valeur={String(r.prestataires)}
          verdict={r.prestataires ? { ton: 'vigilance', texte: 'Pas déclarés CNSS' } : { ton: 'bon', texte: 'Aucun' }}
          pourquoi={r.prestataires ? 'Ils travaillent chez le client comme les autres mais sont payés sur facture de prestation (10 % retenus). Un contrôle peut les requalifier en salariés.' : 'Tous les agents ont un bulletin de paie.'}
          conseil={r.prestataires ? 'Voir les prestataires' : null} onClick={() => setFiltre('prestataires')} />
      </div>

      {mois.length > 0 && (
        <section className="xp-section">
          <h2 className="xp-section-titre"><span>Agent par agent en {nomMois} <small>facturé, coûté, gardé</small></span></h2>
          <div className="xp-liste">
            {[...mois].sort((x, y) => x.taux - y.taux).map((x) => (
              <button key={x.agent.id} className="xp-ligne cliquable" onClick={() => setOuvert(x.agent)}>
                <span className={`g7-puce-icone ${x.taux < 0 ? 'mauvais' : x.taux < 15 ? 'vigilance' : 'bon'}`}><Icone nom="graphique" taille={16} /></span>
                <span className="xp-ligne-texte">
                  <strong>{x.agent.nom}</strong>
                  <small>Facturé {formatFcfa(x.facture)} · coûté {formatFcfa(x.cout)}{x.unites.length ? ` · ${x.unites.join(', ')}` : ''}</small>
                </span>
                <span className="xp-ligne-valeur">
                  <span className={x.marge < 0 ? 'texte-erreur' : ''}>{x.marge > 0 ? '+' : ''}{formatFcfa(x.marge)}</span>
                  <small>{x.taux} % gardé</small>
                </span>
              </button>
            ))}
          </div>
          {r.duMois.length > mois.length && (
            <p className="g7-note">Pas comparés : {r.duMois.filter((x) => !(x.facture && x.cout)).map((x) => `${x.agent.nom} (${x.cout ? 'payé, rien de facturé à son nom' : 'facturé, pas de bulletin rangé'})`).join(' · ')}.</p>
          )}
        </section>
      )}

      <section className="xp-section">
        <h2 className="xp-section-titre">
          <span>Les agents <small>{pluriel(liste.length, 'agent')}</small></span>
          <Segments libelle="Filtrer" valeur={filtreEffectif} onChange={setFiltre}
            options={[['alertes', 'Pertes'], ['actifs', 'En poste'], ['salaries', 'Salariés'], ['prestataires', 'Prestataires'], ['sortis', 'Sortis']]} />
        </h2>
        {liste.length === 0 ? (
          <Vide titre={agents.length ? 'Aucun agent ici.' : 'Aucun agent enregistré.'}
            texte={agents.length ? null : 'Ajoutez les agents placés chez les clients : le site calcule ce que chacun coûte et rapporte, et prévient avant la fin des contrats.'}
            action={peutEcrire && !agents.length ? <button className="bouton principal" onClick={() => setOuvert({})}>Ajouter un agent</button> : null} />
        ) : (
          <div className="xp-liste">
            {liste.map(({ agent: a, alertes }) => {
              const m = margeAgent(a, bulletins)
              return (
                <button key={a.id} className="xp-ligne cliquable" onClick={() => setOuvert(a)}>
                  <Avatar nom={a.nom} />
                  <span className="xp-ligne-texte">
                    <strong>{a.nom}{a.qualification ? ` · ${a.qualification}` : ''}</strong>
                    <small>
                      {a.statut === 'sorti' ? 'Sorti' : parClient[a.client_id]?.nom || 'Pas placé'}{a.site ? ` · ${a.site}` : ''}
                      {' · '}{a.statut_emploi === 'prestataire' ? 'Prestataire' : TYPES_CONTRAT[a.type_contrat]}{a.fin ? ` jusqu’au ${formatDate(a.fin)}` : ''}
                    </small>
                    {alertes.length > 0 && (
                      <span className="g7-actions">
                        {alertes.map((al) => <span key={al.cle} className={`xp-verdict ${al.ton}`}>{al.texte}</span>)}
                      </span>
                    )}
                  </span>
                  <span className="xp-ligne-valeur">
                    {a.prix_facture ? `${formatFcfa(a.prix_facture)}` : '—'}
                    <small>{a.prix_facture ? UNITES_FACTURE[a.unite_facture] : ''}{m ? ` · coûte ${formatFcfa(m.cout)}` : ''}</small>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <p className="g7-note">Coût réel = salaire brut + primes + indemnités (transport, salissure, panier) + charges de l’employeur (CNSS 20,28 % et TUS 7,5 %), divisé par les jours ou les heures payés sur le dernier bulletin. Pour un prestataire : le total de sa facture. Sans bulletin, le coût est estimé à partir du salaire de base.</p>
      </section>

      {ouvert && (
        <FicheAgent a={ouvert} clients={clients} bulletins={bulletins} factures={factures} peutEcrire={peutEcrire} estGerant={estGerant}
          fermer={() => setOuvert(null)} enregistre={() => { setOuvert(null); recharger() }} />
      )}
    </>
  )
}

const graviteDe = (alertes) => alertes.reduce((s, al) => s + (al.ton === 'mauvais' ? 10 : 1), 0)

function FicheAgent({ a, clients, bulletins, factures, peutEcrire, estGerant, fermer, enregistre }) {
  const [v, setV] = useState({
    nom: a.nom || '', qualification: a.qualification || '', client_id: a.client_id || clients[0]?.id || '', site: a.site || '',
    statut: a.statut || 'actif', type_contrat: a.type_contrat || 'cdd', debut: a.debut || '', fin: a.fin || '',
    salaire_base: a.salaire_base ?? '', unite_facture: a.unite_facture || 'jour', prix_facture: a.prix_facture ?? '',
    matricule_cnss: a.matricule_cnss || '', telephone: a.telephone || '', note: a.note || '',
    statut_emploi: a.statut_emploi || 'salarie', categorie: a.categorie || '',
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const ch = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const client = clients.find((c) => c.id === v.client_id)
  const brouillon = { ...v, id: a.id, salaire_base: Number(v.salaire_base || 0), prix_facture: Number(v.prix_facture || 0) }
  const cout = coutUnitaire(brouillon, bulletins)
  const reel = coutEstReel(brouillon, bulletins)
  const plancher = prixPlancher(brouillon, client, bulletins)
  const m = margeAgent(brouillon, bulletins)
  const alertes = alertesAgent(brouillon, client, new Date(), bulletins)
  const historique = a.id ? historiqueAgent(a, bulletins, factures) : []

  async function enregistrer() {
    if (!v.nom.trim()) return setErreur('Indiquez le nom de l’agent.')
    if (v.type_contrat === 'cdd' && !v.fin) return setErreur('Un CDD a une date de fin.')
    setEnvoi(true)
    try {
      await api.enregistrerAgent({
        id: a.id, nom: v.nom.trim(), qualification: v.qualification || null, client_id: v.client_id || null, site: v.site || null,
        statut: v.statut, type_contrat: v.type_contrat, debut: v.debut || null, fin: v.fin || null,
        salaire_base: v.salaire_base === '' ? null : Number(v.salaire_base), unite_facture: v.unite_facture,
        prix_facture: v.prix_facture === '' ? null : Number(v.prix_facture),
        matricule_cnss: v.matricule_cnss.trim() || null, telephone: v.telephone.trim() || null, note: v.note || null,
        statut_emploi: v.statut_emploi, categorie: v.categorie.trim() || null,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer la fiche de ${a.nom} ? Pour un agent qui part, choisissez plutôt « Sorti ».`)) return
    setEnvoi(true)
    try { await api.supprimerAgent(a.id); enregistre() } catch (e) { setErreur(traduireErreur(e)); setEnvoi(false) }
  }

  return (
    <Modale titre={a.id ? a.nom : 'Nouvel agent'} fermer={fermer} large
      pied={peutEcrire ? (
        <>
          {a.id && estGerant && <button className="bouton danger" onClick={supprimer} disabled={envoi}>Supprimer</button>}
          <button className="bouton principal" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      ) : null}>
      <fieldset className="g7-champs" disabled={!peutEcrire}>
        <div className="g7-deux">
          <Champ libelle="Nom et prénom"><input value={v.nom} onChange={ch('nom')} autoFocus={!a.id} /></Champ>
          <Champ libelle="Métier"><input value={v.qualification} onChange={ch('qualification')} placeholder="Électricien, soudeur, chauffeur…" /></Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Placé chez">
            <select value={v.client_id} onChange={ch('client_id')}>
              <option value="">Pas placé</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Champ>
          <Champ libelle="Site"><input value={v.site} onChange={ch('site')} placeholder="Base, plateforme, chantier…" /></Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Payé comment">
            <select value={v.statut_emploi} onChange={ch('statut_emploi')}>
              {Object.entries(STATUTS_EMPLOI).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Champ>
          <Champ libelle="Catégorie"><input value={v.categorie} onChange={ch('categorie')} placeholder="7 échelon 2" /></Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Contrat">
            <select value={v.type_contrat} onChange={ch('type_contrat')}>
              {Object.entries(TYPES_CONTRAT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Champ>
          <Champ libelle="Situation">
            <select value={v.statut} onChange={ch('statut')}>
              <option value="actif">En poste</option>
              <option value="sorti">Sorti</option>
            </select>
          </Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Début"><input type="date" value={v.debut} onChange={ch('debut')} /></Champ>
          <Champ libelle={v.type_contrat === 'cdd' ? 'Fin du contrat' : 'Fin (facultatif)'}
            aide={v.fin ? (joursAvant(v.fin) < 0 ? 'Date dépassée.' : `Dans ${pluriel(joursAvant(v.fin), 'jour')}.`) : null}>
            <input type="date" value={v.fin} onChange={ch('fin')} />
          </Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Salaire de base par mois" aide={cout ? `${reel ? 'Coût réel (dernier bulletin)' : 'Coût estimé'} : ${formatFcfa(cout)} ${UNITES_FACTURE[v.unite_facture]}.` : 'Sert à estimer le coût tant qu’aucun bulletin n’est rangé.'}>
            <ChampMontant valeur={v.salaire_base} onChange={(x) => setV({ ...v, salaire_base: x })} />
          </Champ>
          <Champ libelle="Prix facturé au client" aide={plancher ? `Minimum selon la convention : ${formatFcfa(plancher)}.` : null}>
            <div className="g7-prix-unite">
              <ChampMontant valeur={v.prix_facture} onChange={(x) => setV({ ...v, prix_facture: x })} />
              <select value={v.unite_facture} onChange={ch('unite_facture')} aria-label="Unité">
                {Object.entries(UNITES_FACTURE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </Champ>
        </div>
        {m && (
          <div className="g7-calcul">
            <span>Rapporte environ <b>{formatFcfa(m.parMois)}</b> par mois complet ({m.taux} % du prix facturé).</span>
          </div>
        )}
        {alertes.length > 0 && (
          <ul className="g7-alertes">
            {alertes.map((al) => <li key={al.cle} className={al.ton}>{al.texte}</li>)}
          </ul>
        )}
        <div className="g7-deux">
          <Champ libelle="Matricule CNSS"><input value={v.matricule_cnss} onChange={ch('matricule_cnss')} /></Champ>
          <Champ libelle="Téléphone"><input type="tel" value={v.telephone} onChange={ch('telephone')} /></Champ>
        </div>
        <Champ libelle="Note"><textarea rows={2} value={v.note} onChange={ch('note')} /></Champ>
      </fieldset>
      <Erreur message={erreur} />

      {historique.length > 0 && (
        <>
          <h3 className="xp-section-titre">Mois par mois <small>bulletins et factures</small></h3>
          <div className="xp-liste">
            {historique.map((h) => (
              <div key={h.periode} className="xp-ligne">
                <span className="xp-ligne-texte">
                  <strong style={{ textTransform: 'capitalize' }}>{nomPeriode(h.periode)}</strong>
                  <small>Facturé {h.facture ? formatFcfa(h.facture) : '— (rien à son nom)'} · coûté {h.cout ? formatFcfa(h.cout) : '— (pas de bulletin)'}{h.unites.length ? ` · ${h.unites.join(', ')}` : ''}</small>
                  {h.notes.map((n, i) => <span key={i} className="g7-detail vigilance petit">{n}</span>)}
                </span>
                <span className="xp-ligne-valeur">
                  {h.marge === null ? '—' : <span className={h.marge < 0 ? 'texte-erreur' : ''}>{h.marge > 0 ? '+' : ''}{formatFcfa(h.marge)}</span>}
                  <small>{h.taux === null ? '' : `${h.taux} % gardé`}</small>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modale>
  )
}
