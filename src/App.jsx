import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { api, modeDemo, traduireErreur } from './lib/api.js'
import { decalerPeriode, nomPeriode, periodeDe } from './lib/regles.js'
import { construireVue } from './lib/vue.js'
import Connexion from './ecrans/Connexion.jsx'
import Accueil from './ecrans/Accueil.jsx'
import Depenses from './ecrans/Depenses.jsx'
import Echeances from './ecrans/Echeances.jsx'
import Cnss from './ecrans/Cnss.jsx'
import Papiers from './ecrans/Papiers.jsx'
import Reglages from './ecrans/Reglages.jsx'
import NouvelleDepense from './ecrans/NouvelleDepense.jsx'

const ONGLETS = [
  { id: 'accueil', nom: 'Accueil', icone: '◉' },
  { id: 'depenses', nom: 'Dépenses', icone: '↧' },
  { id: 'echeances', nom: 'À payer', icone: '◷' },
  { id: 'cnss', nom: 'CNSS', icone: '🛡' },
  { id: 'papiers', nom: 'Papiers', icone: '▤' },
  { id: 'reglages', nom: 'Réglages', icone: '⚙' },
]

function lireOnglet() {
  const h = window.location.hash.replace('#/', '').split('?')[0]
  return ONGLETS.some((o) => o.id === h) ? h : 'accueil'
}

export default function App() {
  const [session, setSession] = useState(modeDemo ? { user: { email: 'demo@groupe7m' } } : undefined)
  const [recuperation, setRecuperation] = useState(false)

  useEffect(() => {
    if (modeDemo) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((evenement, s) => {
      if (evenement === 'PASSWORD_RECOVERY') setRecuperation(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="chargement-page">Chargement…</div>
  if (!session || recuperation) {
    return <Connexion recuperation={recuperation} finRecuperation={() => setRecuperation(false)} />
  }
  return <Tableau email={session.user.email} />
}

function Tableau({ email }) {
  const [onglet, setOnglet] = useState(lireOnglet)
  const [periode, setPeriode] = useState(periodeDe(new Date()))
  const [membre, setMembre] = useState(undefined)
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')
  const [saisie, setSaisie] = useState(null) // pré-remplissage de « Nouvelle dépense »
  const [filtrePoste, setFiltrePoste] = useState('')
  const ceMois = periodeDe(new Date())

  useEffect(() => {
    const ecoute = () => setOnglet(lireOnglet())
    window.addEventListener('hashchange', ecoute)
    return () => window.removeEventListener('hashchange', ecoute)
  }, [])

  const aller = (id) => { window.location.hash = `#/${id}`; window.scrollTo(0, 0) }

  useEffect(() => {
    api.monRole(email).then(setMembre).catch((e) => { setMembre(null); setErreur(traduireErreur(e)) })
  }, [email])

  const charger = useCallback(async () => {
    try {
      setErreur('')
      if (periode <= ceMois) await api.preparerMois(periode)
      const debut = decalerPeriode(periode, -12)
      const [postes, depenses, echeances, depensesPeriodes, cnss, autorisations] = await Promise.all([
        api.listerPostes(),
        api.listerDepenses(decalerPeriode(periode, -1), periode),
        api.listerEcheances(debut, periode),
        api.depensesDesPeriodes(debut, ceMois > periode ? ceMois : periode),
        api.listerCnss(),
        api.listerAutorisations(),
      ])
      setDonnees({ postes, depenses, echeances, depensesPeriodes, cnss, autorisations })
    } catch (e) {
      setErreur(traduireErreur(e))
    }
  }, [periode, ceMois])

  useEffect(() => { if (membre) charger() }, [membre, charger])

  const vue = useMemo(() => donnees && construireVue({ ...donnees, periode }), [donnees, periode])
  const peutEcrire = membre && membre.role !== 'lecteur'
  const estGerant = membre?.role === 'gerant'

  const deconnexion = () => (modeDemo ? null : supabase.auth.signOut())

  if (membre === undefined) return <div className="chargement-page">Chargement…</div>
  if (membre === null) {
    return (
      <div className="page-centre">
        <div className="carte carte-etroite">
          <h1>Accès refusé</h1>
          <p>Le compte <b>{email}</b> n'est pas autorisé sur le tableau de bord de Groupe7M services.</p>
          {erreur && <p className="texte-erreur">{erreur}</p>}
          <button className="bouton" onClick={deconnexion}>Se déconnecter</button>
        </div>
      </div>
    )
  }

  const ouvrirSaisie = (pre = {}) => setSaisie(pre)
  const commun = { vue, donnees, periode, peutEcrire, estGerant, recharger: charger, ouvrirSaisie, aller }

  return (
    <div className="appli">
      <header className="entete">
        <div className="marque">
          <span className="logo">G7M</span>
          <div>
            <div className="marque-nom">Groupe7M services</div>
            <div className="marque-sous">Où va l'argent</div>
          </div>
        </div>
        <nav className="onglets-haut">
          {ONGLETS.map((o) => (
            <button key={o.id} className={onglet === o.id ? 'actif' : ''} onClick={() => aller(o.id)}>{o.nom}</button>
          ))}
        </nav>
        <div className="entete-droite">
          <span className="qui">{membre.nom}</span>
          {!modeDemo && <button className="lien" onClick={deconnexion}>Sortir</button>}
        </div>
      </header>

      {modeDemo && (
        <div className="bandeau-demo">Démonstration avec des chiffres inventés. Rien n'est enregistré.</div>
      )}

      {['accueil', 'depenses', 'echeances'].includes(onglet) && (
        <div className="choix-mois">
          <button aria-label="Mois précédent" onClick={() => setPeriode(decalerPeriode(periode, -1))}>‹</button>
          <span>{nomPeriode(periode)}</span>
          <button aria-label="Mois suivant" disabled={periode >= ceMois} onClick={() => setPeriode(decalerPeriode(periode, 1))}>›</button>
        </div>
      )}

      <main className="contenu">
        {erreur && (
          <div className="alerte alerte-rouge">
            {erreur} <button className="lien" onClick={charger}>Réessayer</button>
          </div>
        )}
        {!vue ? <div className="chargement">Chargement des chiffres…</div> : (
          <>
            {onglet === 'accueil' && <Accueil {...commun} voirPoste={(id) => { setFiltrePoste(id); aller('depenses') }} />}
            {onglet === 'depenses' && <Depenses {...commun} filtrePoste={filtrePoste} setFiltrePoste={setFiltrePoste} />}
            {onglet === 'echeances' && <Echeances {...commun} />}
            {onglet === 'cnss' && <Cnss {...commun} />}
            {onglet === 'papiers' && <Papiers {...commun} />}
            {onglet === 'reglages' && <Reglages {...commun} email={email} membre={membre} />}
          </>
        )}
      </main>

      {peutEcrire && vue && onglet !== 'reglages' && (
        <button className="bouton-flottant" onClick={() => ouvrirSaisie({})}>+ Dépense</button>
      )}

      <nav className="onglets-bas">
        {ONGLETS.map((o) => (
          <button key={o.id} className={onglet === o.id ? 'actif' : ''} onClick={() => aller(o.id)}>
            <span className="onglet-icone">{o.icone}</span>
            <span>{o.nom}</span>
          </button>
        ))}
      </nav>

      {saisie && donnees && (
        <NouvelleDepense
          postes={donnees.postes.filter((p) => p.actif)}
          pre={saisie}
          fermer={() => setSaisie(null)}
          enregistre={() => { setSaisie(null); charger() }}
        />
      )}
    </div>
  )
}
