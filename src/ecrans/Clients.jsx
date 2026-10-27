import { useState } from 'react'
import { api, traduireErreur } from '../lib/api.js'
import { formatDate, formatFcfa, joursAvant, nomPeriode } from '../lib/regles.js'
import { encours, etatFacture, resteFacture } from '../lib/facturation.js'
import { margeAgent } from '../lib/agents.js'
import { EnteteXp, Tuile, pluriel } from '../dream/communs.jsx'
import { Champ, Erreur, Icone, Modale, Vide } from '../ui/kit.jsx'

// Inspiré de « Qui me doit » et des contrats de The Dream : un client = ce qu'il doit, son contrat, ses agents.
export default function Clients({ donnees, peutEcrire, recharger, aller }) {
  const [ouvert, setOuvert] = useState(null)
  const { clients, factures, agents } = donnees
  const fiches = clients.map((c) => {
    const sesFactures = factures.filter((f) => f.client_id === c.id)
    const e = encours(sesFactures, [c])
    const annee = String(new Date().getFullYear())
    const factureAnnee = sesFactures.filter((f) => f.periode.startsWith(annee)).reduce((s, f) => s + Number(f.montant || 0), 0)
    const payees = sesFactures.filter((f) => f.date_paiement && resteFacture(f) === 0)
    const delaiReel = payees.length
      ? Math.round(payees.reduce((s, f) => s + (new Date(f.date_paiement) - new Date(f.date_facture)) / 86400000, 0) / payees.length)
      : null
    const sesAgents = (agents || []).filter((a) => a.client_id === c.id && a.statut !== 'sorti')
    const finContrat = c.contrat_fin ? joursAvant(c.contrat_fin) : null
    return { c, e, factureAnnee, delaiReel, sesAgents, sesFactures, finContrat }
  })
  const totalAnnee = fiches.reduce((s, x) => s + x.factureAnnee, 0)

  return (
    <>
      <EnteteXp surtitre="Argent" titre="Clients" sousTitre="Ce que chaque client a commandé, ce qu’il doit, s’il paie à l’heure, et quand son contrat se termine.">
        {peutEcrire && <button className="bouton principal" onClick={() => setOuvert({})}><Icone nom="plus" taille={16} />Nouveau client</button>}
      </EnteteXp>

      {fiches.length === 0 ? <Vide titre="Aucun client enregistré." /> : (
        <div className="xp-grille large">
          {fiches.map(({ c, e, factureAnnee, delaiReel, sesAgents, finContrat }) => {
            const part = totalAnnee ? Math.round((factureAnnee / totalAnnee) * 100) : 0
            const ton = e.retard ? 'mauvais' : finContrat !== null && finContrat <= 60 ? 'vigilance' : 'bon'
            return (
              <Tuile key={c.id} className={ton !== 'bon' ? `xp-reco ${ton}` : ''} titre={c.nom} icone="clients" valeur={formatFcfa(e.du)} unite="à encaisser"
                verdict={e.retard ? { ton: 'mauvais', texte: `${formatFcfa(e.retard)} en retard` } : e.du ? { ton: 'neutre', texte: 'Dans les délais' } : { ton: 'bon', texte: 'Rien dû' }}
                pourquoi={[
                  `${formatFcfa(factureAnnee)} facturés cette année${part ? ` (${part} % du chiffre)` : ''}.`,
                  delaiReel !== null ? `Paie en ${delaiReel} jours en moyenne (contrat : ${c.delai_paiement} jours).` : `Délai prévu : ${c.delai_paiement} jours.`,
                  sesAgents.length ? `${pluriel(sesAgents.length, 'agent placé', 'agents placés')}.` : null,
                  c.contrat_fin ? (finContrat < 0 ? `Contrat terminé le ${formatDate(c.contrat_fin)}.` : `Contrat jusqu’au ${formatDate(c.contrat_fin)}.`) : null,
                ].filter(Boolean).join(' ')}
                conseil="Ouvrir la fiche" onClick={() => setOuvert(c)} />
            )
          })}
        </div>
      )}

      {fiches.length === 1 && totalAnnee > 0 && (
        <section className="xp-section">
          <Tuile className="xp-reco vigilance" titre="Un seul client" icone="alerte" verdict={{ ton: 'vigilance', texte: '100 % du chiffre' }}
            pourquoi="Tout le chiffre d’affaires dépend d’un seul client. S’il réduit ses commandes ou paie en retard, toute la société est touchée."
            conseil="Chercher un deuxième client (autres sociétés pétrolières, chantiers, ports)" />
        </section>
      )}

      {ouvert && (
        <FicheClient c={ouvert} fiche={fiches.find((x) => x.c.id === ouvert.id)} peutEcrire={peutEcrire} aller={aller}
          fermer={() => setOuvert(null)} enregistre={() => { setOuvert(null); recharger() }} />
      )}
    </>
  )
}

function FicheClient({ c, fiche, peutEcrire, aller, fermer, enregistre }) {
  const [v, setV] = useState({
    nom: c.nom || '', contact: c.contact || '', delai_paiement: c.delai_paiement ?? 45, coefficient: c.coefficient ?? 1.2,
    contrat_debut: c.contrat_debut || '', contrat_fin: c.contrat_fin || '', note: c.note || '',
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const ch = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const ouvertes = fiche ? fiche.sesFactures.filter((f) => resteFacture(f) > 0) : []

  async function enregistrer() {
    if (!v.nom.trim()) return setErreur('Indiquez le nom du client.')
    setEnvoi(true)
    try {
      await api.enregistrerClient({
        id: c.id, nom: v.nom.trim(), contact: v.contact || null, delai_paiement: Number(v.delai_paiement || 45),
        coefficient: Number(String(v.coefficient).replace(',', '.')) || 1.2,
        contrat_debut: v.contrat_debut || null, contrat_fin: v.contrat_fin || null, note: v.note || null,
      })
      enregistre()
    } catch (e) {
      setErreur(traduireErreur(e))
      setEnvoi(false)
    }
  }

  return (
    <Modale titre={c.id ? c.nom : 'Nouveau client'} fermer={fermer} large
      pied={peutEcrire ? <button className="bouton principal" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button> : null}>
      <fieldset className="g7-champs" disabled={!peutEcrire}>
        <div className="g7-deux">
          <Champ libelle="Nom du client"><input value={v.nom} onChange={ch('nom')} /></Champ>
          <Champ libelle="Contact"><input value={v.contact} onChange={ch('contact')} placeholder="Personne ou service à relancer" /></Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Délai de paiement (jours)"><input inputMode="numeric" value={v.delai_paiement} onChange={(e) => setV({ ...v, delai_paiement: e.target.value.replace(/\D/g, '') })} /></Champ>
          <Champ libelle="Coefficient de la convention" aide="Prix minimum = coût de l’agent × ce coefficient.">
            <input inputMode="decimal" value={v.coefficient} onChange={ch('coefficient')} />
          </Champ>
        </div>
        <div className="g7-deux">
          <Champ libelle="Début du contrat"><input type="date" value={v.contrat_debut} onChange={ch('contrat_debut')} /></Champ>
          <Champ libelle="Fin du contrat" aide="Le tableau de bord prévient 60 jours avant."><input type="date" value={v.contrat_fin} onChange={ch('contrat_fin')} /></Champ>
        </div>
        <Champ libelle="Note"><input value={v.note} onChange={ch('note')} /></Champ>
      </fieldset>
      <Erreur message={erreur} />

      {fiche && (
        <>
          <h3 className="xp-section-titre">Factures à encaisser <small>{formatFcfa(fiche.e.du)}</small></h3>
          {ouvertes.length === 0 ? <p className="texte-doux">Rien à encaisser.</p> : (
            <div className="xp-liste">
              {ouvertes.map((f) => {
                const etat = etatFacture(f, c)
                return (
                  <div key={f.id} className="xp-ligne">
                    <span className="xp-ligne-texte">
                      <strong>N° {f.numero}</strong>
                      <small>Travail de {nomPeriode(f.periode)} · émise le {formatDate(f.date_facture)}</small>
                    </span>
                    <span className="xp-ligne-valeur">{formatFcfa(resteFacture(f))}<small className={etat === 'en_retard' ? 'texte-erreur' : ''}>{etat === 'en_retard' ? 'en retard' : 'à venir'}</small></span>
                  </div>
                )
              })}
            </div>
          )}
          {fiche.sesAgents.length > 0 && (
            <>
              <h3 className="xp-section-titre">Agents placés <small>{fiche.sesAgents.length}</small></h3>
              <div className="xp-liste">
                {fiche.sesAgents.map((a) => (
                  <div key={a.id} className="xp-ligne">
                    <span className="xp-ligne-texte"><strong>{a.nom}</strong><small>{a.qualification || ''}{a.site ? ` · ${a.site}` : ''}</small></span>
                    <span className="xp-ligne-valeur">{margeAgent(a) ? formatFcfa(margeAgent(a).parMois) : '—'}<small>par mois</small></span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="g7-boutons"><button className="lien" onClick={() => aller('factures')}>Voir toutes les factures</button></div>
        </>
      )}
    </Modale>
  )
}
