import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { api, modeDemo, traduireErreur } from './lib/api.js'
import { decalerPeriode, identifiantAffiche, nomPeriode, periodeDe } from './lib/regles.js'
import { construireVue } from './lib/vue.js'
import { Avatar, Chargement, Erreur, Icone } from './ui/kit.jsx'
import Connexion, { CadreAuth } from './ecrans/Connexion.jsx'
import Accueil from './ecrans/Accueil.jsx'
import Depenses from './ecrans/Depenses.jsx'
import Echeances from './ecrans/Echeances.jsx'
import Cnss from './ecrans/Cnss.jsx'
import Papiers from './ecrans/Papiers.jsx'
import Reglages from './ecrans/Reglages.jsx'
import Factures from './ecrans/Factures.jsx'
import Marge from './ecrans/Marge.jsx'
import NouvelleDepense from './ecrans/NouvelleDepense.jsx'
import Agents from './ecrans/Agents.jsx'
import Clients from './ecrans/Clients.jsx'
import Tresorerie from './ecrans/Tresorerie.jsx'
import Rapport from './ecrans/Rapport.jsx'

// Même structure que The Dream : menu par groupes à gauche, barre du haut, onglets en bas sur téléphone.
const GROUPES_MENU = [
  {
    titre: 'Pilotage',
    ecrans: [
      { id: 'accueil', nom: 'Tableau de bord', icone: 'tableau', court: 'Tableau' },
      { id: 'marge', nom: 'Marge du mois', icone: 'graphique', court: 'Marge' },
      { id: 'tresorerie', nom: 'Trésorerie prévue', icone: 'billet', court: 'Trésorerie' },
      { id: 'rapport', nom: 'Rapport du mois', icone: 'imprimer', court: 'Rapport' },
    ],
  },
  {
    titre: 'Argent',
    ecrans: [
      { id: 'clients', nom: 'Clients', icone: 'clients' },
      { id: 'factures', nom: 'Factures clients', icone: 'facture', court: 'Factures' },
      { id: 'depenses', nom: 'Dépenses', icone: 'depenses' },
      { id: 'echeances', nom: 'À payer', icone: 'echeance' },
    ],
  },
  { titre: 'Personnel', ecrans: [{ id: 'agents', nom: 'Agents placés', icone: 'membres', court: 'Agents' }] },
  {
    titre: 'Obligations',
    ecrans: [
      { id: 'cnss', nom: 'CNSS', icone: 'badge' },
      { id: 'papiers', nom: 'Papiers et autorisations', icone: 'dossier', court: 'Papiers' },
    ],
  },
  { titre: 'Organisation', ecrans: [{ id: 'reglages', nom: 'Paramètres', icone: 'parametres' }] },
]
const ECRANS = GROUPES_MENU.flatMap((g) => g.ecrans)
const ONGLETS_MOBILE = ['accueil', 'factures', 'depenses', 'echeances']

function lireOnglet() {
  const h = window.location.hash.replace('#/', '').split('?')[0]
  return ECRANS.some((o) => o.id === h) ? h : 'accueil'
}

export default function App() {
  const [session, setSession] = useState(modeDemo ? { user: { email: 'patrong7@groupe7m.local' } } : undefined)
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

  if (session === undefined) return <CadreAuth><Chargement /></CadreAuth>
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
  const [menuOuvert, setMenuOuvert] = useState(false)
  const ceMois = periodeDe(new Date())
  const contenu = useRef(null)

  useEffect(() => {
    const ecoute = () => setOnglet(lireOnglet())
    window.addEventListener('hashchange', ecoute)
    return () => window.removeEventListener('hashchange', ecoute)
  }, [])

  const aller = (id) => {
    window.location.hash = `#/${id}`
    setMenuOuvert(false)
    contenu.current?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    api.monRole(email).then(setMembre).catch((e) => { setMembre(null); setErreur(traduireErreur(e)) })
  }, [email])

  const charger = useCallback(async () => {
    try {
      setErreur('')
      if (periode <= ceMois) await api.preparerMois(periode)
      const debut = decalerPeriode(periode, -12)
      const [postes, depenses, echeances, depensesPeriodes, cnss, autorisations, clients, factures, paie, agents] = await Promise.all([
        api.listerPostes(),
        api.listerDepenses(decalerPeriode(periode, -1), periode),
        api.listerEcheances(debut, periode),
        api.depensesDesPeriodes(debut, ceMois > periode ? ceMois : periode),
        api.listerCnss(),
        api.listerAutorisations(),
        api.listerClients(),
        api.listerFactures(),
        api.listerPaie(),
        api.listerAgents(),
      ])
      setDonnees({ postes, depenses, echeances, depensesPeriodes, cnss, autorisations, clients, factures, paie, agents })
    } catch (e) {
      setErreur(traduireErreur(e))
    }
  }, [periode, ceMois])

  useEffect(() => { if (membre) charger() }, [membre, charger])

  const vue = useMemo(() => donnees && construireVue({ ...donnees, periode }), [donnees, periode])
  const peutEcrire = membre && membre.role !== 'lecteur'
  const estGerant = membre?.role === 'gerant'

  const deconnexion = () => (modeDemo ? null : supabase.auth.signOut())

  if (membre === undefined) return <CadreAuth><Chargement /></CadreAuth>
  if (membre === null) {
    return (
      <CadreAuth>
        <div className="connexion-carte">
          <Marque />
          <h1>Accès refusé</h1>
          <p>Le compte <b>{identifiantAffiche(email)}</b> n'est pas autorisé sur le tableau de bord de Groupe7M services.</p>
          <Erreur message={erreur} />
          <button className="bouton principal" onClick={deconnexion}>Se déconnecter</button>
        </div>
      </CadreAuth>
    )
  }

  const ouvrirSaisie = (pre = {}) => setSaisie(pre)
  const choixMois = (
    <div className="g7-mois" role="group" aria-label="Mois affiché">
      <button className="icone-bouton gauche" aria-label="Mois précédent" onClick={() => setPeriode(decalerPeriode(periode, -1))}><Icone nom="chevron" /></button>
      <strong>{nomPeriode(periode)}</strong>
      <button className="icone-bouton" aria-label="Mois suivant" disabled={periode >= ceMois} onClick={() => setPeriode(decalerPeriode(periode, 1))}><Icone nom="chevron" /></button>
    </div>
  )
  const commun = { vue, donnees, periode, setPeriode, peutEcrire, estGerant, recharger: charger, ouvrirSaisie, aller, choixMois, membre }
  const ecran = ECRANS.find((e) => e.id === onglet)

  return (
    <div className="coquille">
      <aside className={`menu ${menuOuvert ? 'ouvert' : ''}`} aria-label="Menu principal">
        <Marque />
        <nav>
          {GROUPES_MENU.map((g) => (
            <div key={g.titre} className="menu-groupe">
              <span className="menu-groupe-titre">{g.titre}</span>
              {g.ecrans.map((e) => (
                <button key={e.id} className={onglet === e.id ? 'actif' : ''} aria-current={onglet === e.id ? 'page' : undefined} onClick={() => aller(e.id)}>
                  <Icone nom={e.icone} />
                  <span>{e.nom}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="menu-pied">
          <div className="utilisateur">
            <Avatar nom={membre.nom} />
            <div>
              <strong>{membre.nom}</strong>
              <small>{membre.role === 'gerant' ? 'Gérant' : membre.role === 'saisie' ? 'Saisie' : 'Lecture seule'}</small>
            </div>
          </div>
          {!modeDemo && <button className="lien" onClick={deconnexion}>Se déconnecter</button>}
        </div>
      </aside>
      {menuOuvert && <div className="voile-menu" onClick={() => setMenuOuvert(false)} />}

      <div className="colonne">
        <header className="barre-haut">
          <button className="icone-bouton bouton-menu" aria-label="Ouvrir le menu" onClick={() => setMenuOuvert(true)}><Icone nom="menu" /></button>
          <nav className="fil-ariane" aria-label="Vous êtes ici">
            <ol>
              <li><a href="#/accueil">Groupe7M services</a></li>
              <li><span>{ecran?.nom}</span></li>
            </ol>
          </nav>
          <div className="barre-haut-outils">
            {peutEcrire && vue && (
              <button className="bouton principal" onClick={() => ouvrirSaisie({})} aria-label="Nouvelle dépense">
                <Icone nom="plus" taille={16} /><span>Nouvelle dépense</span>
              </button>
            )}
            <Profil membre={membre} email={email} deconnexion={deconnexion} aller={aller} />
          </div>
        </header>

        <main className="contenu" ref={contenu}>
          <div className="xp-page">
            {modeDemo && (
              <div className="g7-demo"><Icone nom="alerte" taille={16} />Démonstration avec des chiffres inventés. Rien n'est enregistré.</div>
            )}
            {erreur && <Erreur message={erreur} action={<button className="lien" onClick={charger}>Réessayer</button>} />}
            {!vue ? <Chargement texte="Chargement des chiffres…" /> : (
              <>
                {onglet === 'accueil' && <Accueil {...commun} voirPoste={(id) => { setFiltrePoste(id); aller('depenses') }} />}
                {onglet === 'factures' && <Factures {...commun} />}
                {onglet === 'marge' && <Marge {...commun} />}
                {onglet === 'tresorerie' && <Tresorerie {...commun} />}
                {onglet === 'rapport' && <Rapport {...commun} />}
                {onglet === 'clients' && <Clients {...commun} />}
                {onglet === 'agents' && <Agents {...commun} />}
                {onglet === 'depenses' && <Depenses {...commun} filtrePoste={filtrePoste} setFiltrePoste={setFiltrePoste} />}
                {onglet === 'echeances' && <Echeances {...commun} />}
                {onglet === 'cnss' && <Cnss {...commun} />}
                {onglet === 'papiers' && <Papiers {...commun} />}
                {onglet === 'reglages' && <Reglages {...commun} email={email} />}
              </>
            )}
          </div>
        </main>
      </div>

      <nav className="onglets-mobile" aria-label="Accès rapide">
        {ONGLETS_MOBILE.map((id) => {
          const e = ECRANS.find((x) => x.id === id)
          return (
            <button key={id} className={onglet === id ? 'actif' : ''} onClick={() => aller(id)}>
              <Icone nom={e.icone} />
              <span>{e.court || e.nom}</span>
            </button>
          )
        })}
        <button className={menuOuvert || !ONGLETS_MOBILE.includes(onglet) ? 'actif' : ''} onClick={() => setMenuOuvert(true)}>
          <Icone nom="menu" />
          <span>Menu</span>
        </button>
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

function Marque() {
  return (
    <div className="marque g7-marque">
      <span className="g7-plaque"><img src={`${import.meta.env.BASE_URL}logo-g7.png`} alt="Groupe7M Services" /></span>
    </div>
  )
}

function Profil({ membre, email, deconnexion, aller }) {
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef(null)
  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => { if (!zone.current?.contains(e.target)) setOuvert(false) }
    const touche = (e) => e.key === 'Escape' && setOuvert(false)
    document.addEventListener('mousedown', dehors)
    window.addEventListener('keydown', touche)
    return () => { document.removeEventListener('mousedown', dehors); window.removeEventListener('keydown', touche) }
  }, [ouvert])
  const role = membre.role === 'gerant' ? 'Gérant' : membre.role === 'saisie' ? 'Saisie' : 'Lecture seule'
  return (
    <div className="profil-chip" ref={zone}>
      <button className="profil-chip-bouton" aria-expanded={ouvert} aria-haspopup="menu" onClick={() => setOuvert(!ouvert)}>
        <Avatar nom={membre.nom} />
        <span className="profil-chip-texte"><strong>{membre.nom}</strong><small>{role}</small></span>
      </button>
      {ouvert && (
        <div className="g7-profil-menu" role="menu">
          <div className="profil-chip-entete">
            <strong>{membre.nom}</strong>
            <small className="texte-doux">{identifiantAffiche(email)} · {role}</small>
          </div>
          <button role="menuitem" onClick={() => { setOuvert(false); aller('reglages') }}><Icone nom="cle" taille={16} />Changer mon mot de passe</button>
          {!modeDemo && <button role="menuitem" onClick={deconnexion}><Icone nom="sortie" taille={16} />Se déconnecter</button>}
        </div>
      )}
    </div>
  )
}
