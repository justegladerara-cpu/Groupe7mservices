import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Link2, ShoppingBag, Plane, Truck, Package, Users, MessageSquareWarning, Star, Bell, Handshake, Target, Settings, LogOut, Menu, X, ExternalLink } from 'lucide-react'
import { useStore, useCurrentUser, isStaff } from '../lib/store'
import { Logo } from './ui'
import type { Role } from '../lib/types'

const ROLE_LABEL: Record<Role, string> = { admin: 'Administratrice', operations: 'Équipe achats & logistique', support: 'Service client', client: 'Client' }

export default function AdminLayout() {
  const user = useCurrentUser()
  const logout = useStore((s) => s.logout)
  const counts = useStore((s) => ({
    links: s.linkRequests.filter((l) => l.status === 'nouvelle').length,
    buy: s.orders.filter((o) => o.status === 'paiement_confirme').length,
    ship: s.orders.filter((o) => o.status === 'achat_fournisseur').length,
    deliver: s.orders.filter((o) => o.status === 'dedouanement' || o.status === 'en_livraison').length,
    claims: s.claims.filter((c) => c.status === 'ouverte' || c.status === 'en_cours').length,
    reviews: s.reviews.filter((r) => r.status === 'en_attente').length,
  }))
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => setOpen(false), [loc.pathname])
  if (!user) return <Navigate to="/connexion?next=/admin" replace />
  if (!isStaff(user)) return <Navigate to="/compte" replace />
  const r = user.role
  const all: Role[] = ['admin', 'operations', 'support']
  const groups: { title: string; items: { to: string; label: string; icon: React.ReactNode; roles: Role[]; badge?: number; end?: boolean }[] }[] = [
    { title: 'Pilotage', items: [
      { to: '/admin', label: 'Tableau de bord', icon: <LayoutDashboard size={18} />, roles: all, end: true },
      { to: '/admin/pilotage', label: 'Lancement & risques', icon: <Target size={18} />, roles: ['admin'] },
    ] },
    { title: 'Commandes', items: [
      { to: '/admin/commandes', label: 'Toutes les commandes', icon: <ShoppingCart size={18} />, roles: all },
      { to: '/admin/liens', label: 'Demandes par lien', icon: <Link2 size={18} />, roles: all, badge: counts.links },
      { to: '/admin/achats', label: 'Achats fournisseur', icon: <ShoppingBag size={18} />, roles: ['admin', 'operations'], badge: counts.buy },
      { to: '/admin/expeditions', label: 'Transit & douane', icon: <Plane size={18} />, roles: ['admin', 'operations'], badge: counts.ship },
      { to: '/admin/livraisons', label: 'Livraison locale', icon: <Truck size={18} />, roles: ['admin', 'operations'], badge: counts.deliver },
    ] },
    { title: 'Clients', items: [
      { to: '/admin/clients', label: 'Clients', icon: <Users size={18} />, roles: ['admin', 'support'] },
      { to: '/admin/reclamations', label: 'Réclamations', icon: <MessageSquareWarning size={18} />, roles: ['admin', 'support'], badge: counts.claims },
      { to: '/admin/avis', label: 'Avis', icon: <Star size={18} />, roles: ['admin', 'support'], badge: counts.reviews },
      { to: '/admin/notifications', label: 'Notifications', icon: <Bell size={18} />, roles: ['admin', 'support'] },
    ] },
    { title: 'Configuration', items: [
      { to: '/admin/catalogue', label: 'Catalogue', icon: <Package size={18} />, roles: ['admin', 'operations'] },
      { to: '/admin/partenaires', label: 'Partenaires', icon: <Handshake size={18} />, roles: ['admin', 'operations'] },
      { to: '/admin/parametres', label: 'Paramètres & prix', icon: <Settings size={18} />, roles: ['admin'] },
    ] },
  ]

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Link to="/admin"><Logo light /></Link></div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {groups.map((g) => {
          const items = g.items.filter((i) => i.roles.includes(r))
          if (!items.length) return null
          return (
            <div key={g.title}>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-brand-300/70">{g.title}</div>
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/5'}`}>
                  {i.icon}<span className="flex-1">{i.label}</span>
                  {!!i.badge && <span className="rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-slate-900">{i.badge}</span>}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="text-sm font-semibold text-white">{user.name}</div>
        <div className="text-xs text-brand-200">{ROLE_LABEL[r]}</div>
        <div className="mt-3 flex gap-2">
          <Link to="/" className="btn btn-sm flex-1 bg-white/10 text-white hover:bg-white/20"><ExternalLink size={14} />Site</Link>
          <button className="btn btn-sm bg-white/10 text-white hover:bg-white/20" onClick={() => { logout(); nav('/') }} title="Déconnexion"><LogOut size={14} /></button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-brand-950 lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-72 bg-brand-950" onClick={(e) => e.stopPropagation()}>{sidebar}</aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(!open)} className="btn-ghost btn-sm">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <Logo />
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
