import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Home, LayoutGrid, Link2, Menu, ShoppingBag, User, X, PackageSearch, LogOut, Shield, Search, Heart, Zap } from 'lucide-react'
import { useStore, useCurrentUser, isStaff } from '../lib/store'
import { Logo } from './ui'
import ChatWidget from './ChatWidget'
import { useEffect } from 'react'

const NAV = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/catalogue?promo=1', label: 'Ventes flash', hot: true },
  { to: '/catalogue?new=1', label: 'Nouveautés' },
  { to: '/lien', label: 'Commander par lien' },
  { to: '/calculateur', label: 'Calculateur' },
  { to: '/suivi', label: 'Suivre un colis' },
  { to: '/comment-ca-marche', label: 'Comment ça marche' },
  { to: '/avis', label: 'Avis clients' },
]

function SearchBox({ className = '' }: { className?: string }) {
  const products = useStore((s) => s.products)
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const nav = useNavigate()
  const hits = q.length >= 2 ? products.filter((p) => p.active && `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []
  const go = (e?: React.FormEvent) => { e?.preventDefault(); setFocus(false); nav(`/catalogue?q=${encodeURIComponent(q)}`) }
  return (
    <form onSubmit={go} className={`relative ${className}`}>
      <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} className="w-full rounded-full border border-slate-300 bg-slate-50 py-2 pl-10 pr-24 text-sm outline-none focus:border-brand-500 focus:bg-white" placeholder="Robe, baskets, parfum, écouteurs…" aria-label="Rechercher" />
      <button className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-brand-700 px-4 py-1.5 text-xs font-semibold text-white">Chercher</button>
      {focus && hits.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {hits.map((p) => <Link key={p.id} to={`/produit/${p.id}`} className="flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-slate-50"><span className="truncate">{p.name}</span><span className="text-xs text-slate-400">{p.category}</span></Link>)}
        </div>
      )}
    </form>
  )
}

export default function PublicLayout() {
  const user = useCurrentUser()
  const cartCount = useStore((s) => s.cart.reduce((a, c) => a + c.qty, 0))
  const unread = useStore((s) => (user ? s.notifications.filter((n) => n.customerId === user.id && !n.read).length : 0))
  const logout = useStore((s) => s.logout)
  const wishCount = useStore((s) => s.wishlist.length)
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname, loc.search])

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <div className="bg-brand-950 px-4 py-1.5 text-center text-xs font-medium text-brand-100">
        Paiement Mobile Money · Prix tout compris · Livraison à Brazzaville et Pointe-Noire en 15-25 jours
      </div>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <button className="btn-ghost btn-sm md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <Link to="/"><Logo /></Link>
          <SearchBox className="mx-4 hidden max-w-xl flex-1 md:block" />
          <div className="ml-auto flex items-center gap-1">
            <Link to="/favoris" className="relative hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:block" aria-label="Favoris">
              <Heart size={20} />
              {wishCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{wishCount}</span>}
            </Link>
            {isStaff(user) && <Link to="/admin" className="btn-outline btn-sm hidden sm:inline-flex"><Shield size={14} />Back-office</Link>}
            {user && !isStaff(user) && (
              <Link to="/compte/notifications" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
                <Bell size={20} />
                {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
              </Link>
            )}
            <Link to="/panier" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Panier">
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-slate-900">{cartCount}</span>}
            </Link>
            {user ? (
              <div className="flex items-center gap-1">
                <Link to={isStaff(user) ? '/admin' : '/compte'} className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:block">{user.name.split(' ')[0]}</Link>
                <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Se déconnecter" onClick={() => { logout(); nav('/') }}><LogOut size={18} /></button>
              </div>
            ) : (
              <Link to="/connexion" className="btn-primary btn-sm ml-1 whitespace-nowrap">Connexion</Link>
            )}
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden"><SearchBox /></div>
        <nav className="mx-auto hidden max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${loc.pathname + loc.search === n.to || (n.to === '/catalogue' && loc.pathname === '/catalogue' && !loc.search) ? 'bg-brand-50 text-brand-800' : n.hot ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100'}`}>{n.hot && <Zap size={14} className="fill-rose-500" />}{n.label}</Link>
          ))}
        </nav>
        {open && (
          <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            {NAV.map((n) => <Link key={n.to} to={n.to} className={`block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-50 ${n.hot ? 'text-rose-600' : 'text-slate-700'}`}>{n.label}</Link>)}
            <Link to="/favoris" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">Mes favoris</Link>
            {isStaff(user) && <NavLink to="/admin" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700">Back-office</NavLink>}
            <NavLink to="/faq" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">FAQ & politique de retour</NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-16 bg-slate-900 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo light />
            <p className="mt-3 text-sm text-slate-400">Le commerce international, enfin simple pour le Congo. Tu choisis, tu paies, nous nous occupons du reste.</p>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-white">Acheter</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/catalogue" className="hover:text-white">Catalogue</Link></li>
              <li><Link to="/lien" className="hover:text-white">Commander avec un lien</Link></li>
              <li><Link to="/suivi" className="hover:text-white">Suivre mon colis</Link></li>
              <li><Link to="/calculateur" className="hover:text-white">Calculateur de prix</Link></li>
              <li><Link to="/favoris" className="hover:text-white">Mes favoris</Link></li>
              <li><Link to="/compte/parrainage" className="hover:text-white">Parrainage</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-white">Aide</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/comment-ca-marche" className="hover:text-white">Comment ça marche</Link></li>
              <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/faq#retours" className="hover:text-white">Politique de retour</Link></li>
              <li><Link to="/avis" className="hover:text-white">Avis clients</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-white">Paiement</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {['MTN MoMo', 'Airtel Money'].map((m) => <span key={m} className="rounded-md bg-slate-800 px-2 py-1">{m}</span>)}
            </div>
            <p className="mt-4 text-xs text-slate-500">République du Congo · Brazzaville & Pointe-Noire · Bientôt toute l’Afrique centrale</p>
          </div>
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">© 2026 HHHGroup — Plateforme d’achat international</div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
        {[
          { to: '/', icon: <Home size={20} />, label: 'Accueil', end: true },
          { to: '/catalogue', icon: <LayoutGrid size={20} />, label: 'Catalogue' },
          { to: '/lien', icon: <Link2 size={20} />, label: 'Lien' },
          { to: '/suivi', icon: <PackageSearch size={20} />, label: 'Suivi' },
          { to: user ? (isStaff(user) ? '/admin' : '/compte') : '/connexion', icon: <User size={20} />, label: 'Compte' },
        ].map((n) => (
          <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-700' : 'text-slate-500'}`}>
            {n.icon}{n.label}
          </NavLink>
        ))}
      </nav>
      <ChatWidget />
    </div>
  )
}
