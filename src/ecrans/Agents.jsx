import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { formatDate, formatFcfa, joursAvant } from '../lib/regles.js'
import { TYPES_CONTRAT, UNITES_FACTURE, alertesAgent, coutUnitaire, margeAgent, prixPlancher, resumeAgents } from '../lib/agents.js'
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

  const parClient = Object.fromEntries(clients.map((c) => [c.id, c]))
  const r = resumeAgents(agents, clients)
  const lignes = r.avecAlertes
    .concat(agents.filter((a) => a.statut === 'sorti').map((agent) => ({ agent, alertes: [] })))
  const visibles = lignes.filter(({ agent, alertes }) => (
    filtre === 'alertes' ? alertes.length > 0
      : filtre === 'actifs' ? agent.statut !== 'sorti'
        : filtre === 'sortis' ? agent.statut === 'sorti'
          : true
  ))
  const filtreEffectif = filtre === 'alertes' && visibles.length === 0 && agents.length ? 'actifs' : filtre
  const liste = filtreEffectif === filtre ? visibles : lignes.filter(({ agent }) => agent.statut !== 'sorti')

  return (
    <>
      <EnteteXp surtitre="Personnel" titre="Agents placés" sousTitre="Chaque agent, le client où il travaille, son contrat, ce qu’il coûte et ce qu’il rapporte.">
        {peutEcrire && <button className="bouton principal" onClick={() => setOuvert({})}><Icone nom="plus" taille={16} />Nouvel agent</button>}
      </EnteteXp>

      <div className="xp-grille">
        <Tuile titre="Agents en poste" icone="membres" valeur={String(r.actifs)}
          pourquoi={clients.filter((c) => agents.some((a) => a.client_id === c.id && a.statut !== 'sorti')).map((c) => `${c.nom} : ${agents.filter((a) => a.client_id === c.id && a.statut !== 'sorti').length}`).join(' · ') || 'Aucun agent enregistré.'}
          conseil={agents.length ? 'Voir tous les agents' : null} onClick={() => setFiltre('actifs')} />
        <Tuile titre="Rapportent par mois" icone="graphique" valeur={formatFcfa(r.margeMensuelle)}
          verdict={r.margeMensuelle > 0 ? { ton: 'bon', texte: 'Estimation' } : null}
          pourquoi="Prix facturé moins coût de l’agent (salaire + CNSS + TUS), pour un mois complet de 26 jours." />
        <Tuile className={r.sousConvention ? 'xp-reco mauvais' : ''} titre="Facturés sous la convention" icone="alerte" valeur={String(r.sousConvention)}
          verdict={r.sousConvention ? { ton: 'mauvais', texte: 'Argent perdu' } : { ton: 'bon', texte: 'Aucun' }}
          pourquoi={r.sousConvention ? 'Le prix facturé est plus bas que le coût × le coefficient prévu avec le client. À renégocier.' : 'Tous les prix couvrent le coût et la marge prévue.'}
          conseil={r.sousConvention ? 'Voir les alertes' : null} onClick={() => setFiltre('alertes')} />
        <Tuile className={r.finProche ? 'xp-reco vigilance' : ''} titre="Contrats à renouveler" icone="calendrier" valeur={String(r.finProche)}
          verdict={r.finProche ? { ton: 'vigilance', texte: 'Sous 30 jours' } : { ton: 'bon', texte: 'Aucun' }}
          pourquoi={r.sansCnss ? `${pluriel(r.sansCnss, 'agent')} sans matricule CNSS.` : 'Tous les agents ont un matricule CNSS.'} />
      </div>

      <section className="xp-section">
        <h2 className="xp-section-titre">
          <span>Les agents <small>{pluriel(liste.length, 'agent')}</small></span>
          <Segments libelle="Filtrer" valeur={filtreEffectif} onChange={setFiltre}
            options={[['alertes', 'À regarder'], ['actifs', 'En poste'], ['sortis', 'Sortis'], ['tous', 'Tous']]} />
        </h2>
        {liste.length === 0 ? (
          <Vide titre={agents.length ? 'Aucun agent ici.' : 'Aucun agent enregistré.'}
            texte={agents.length ? null : 'Ajoutez les agents placés chez les clients : le site calcule ce que chacun coûte et rapporte, et prévient avant la fin des contrats.'}
            action={peutEcrire && !agents.length ? <button className="bouton principal" onClick={() => setOuvert({})}>Ajouter un agent</button> : null} />
        ) : (
          <div className="xp-liste">
            {liste.map(({ agent: a, alertes }) => {
              const m = margeAgent(a)
              return (
                <button key={a.id} className="xp-ligne cliquable" onClick={() => setOuvert(a)}>
                  <Avatar nom={a.nom} />
                  <span className="xp-ligne-texte">
                    <strong>{a.nom}{a.qualification ? ` · ${a.qualification}` : ''}</strong>
                    <small>
                      {a.statut === 'sorti' ? 'Sorti' : parClient[a.client_id]?.nom || 'Pas placé'}{a.site ? ` · ${a.site}` : ''}
                      {' · '}{TYPES_CONTRAT[a.type_contrat]}{a.fin ? ` jusqu’au ${formatDate(a.fin)}` : ''}
                    </small>
                    {alertes.length > 0 && (
                      <span className="g7-actions">
                        {alertes.map((al) => <span key={al.cle} className={`xp-verdict ${al.ton}`}>{al.texte}</span>)}
                      </span>
                    )}
                  </span>
                  <span className="xp-ligne-valeur">
                    {a.prix_facture ? `${formatFcfa(a.prix_facture)}` : '—'}
                    <small>{a.prix_facture ? UNITES_FACTURE[a.unite_facture] : ''}{m ? ` · ${m.taux} % gardé` : ''}</small>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <p className="g7-note">Coût d’un agent = salaire de base + CNSS employeur (20,28 %) + TUS (7,5 %), sur 26 jours par mois (8 heures par jour). Prix minimum = coût × le coefficient du client (1,2 dans la convention).</p>
      </section>

      {ouvert && (
        <FicheAgent a={ouvert} clients={clients} peutEcrire={peutEcrire} estGerant={estGerant}
          fermer={() => setOuvert(null)} enregistre={() => { setOuvert(null); recharger() }} />
      )}
    </>
  )
}

function FicheAgent({ a, clients, peutEcrire, estGerant, fermer, enregistre }) {
  const [v, setV] = useState({
    nom: a.nom || '', qualification: a.qualification || '', client_id: a.client_id || clients[0]?.id || '', site: a.site || '',
    statut: a.statut || 'actif', type_contrat: a.type_contrat || 'cdd', debut: a.debut || '', fin: a.fin || '',
    salaire_base: a.salaire_base ?? '', unite_facture: a.unite_facture || 'jour', prix_facture: a.prix_facture ?? '',
    matricule_cnss: a.matricule_cnss || '', telephone: a.telephone || '', note: a.note || '',
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const ch = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const client = clients.find((c) => c.id === v.client_id)
  const brouillon = { ...v, salaire_base: Number(v.salaire_base || 0), prix_facture: Number(v.prix_facture || 0) }
  const cout = coutUnitaire(brouillon)
  const plancher = prixPlancher(brouillon, client)
  const m = margeAgent(brouillon)
  const alertes = alertesAgent(brouillon, client)

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
          <Champ libelle="Salaire de base par mois" aide={cout ? `Coût pour G7 : ${formatFcfa(cout)} ${UNITES_FACTURE[v.unite_facture]}.` : 'Sert à calculer ce que l’agent coûte.'}>
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
        <Champ libelle="Note"><input value={v.note} onChange={ch('note')} /></Champ>
      </fieldset>
      <Erreur message={erreur} />
    </Modale>
  )
}
