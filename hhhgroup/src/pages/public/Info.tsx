import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PackageSearch, ShoppingCart, Smartphone, Users, Plane, Landmark, Truck, Bell, ChevronDown, Star } from 'lucide-react'
import { useStore } from '../../lib/store'
import { OrderTimeline, StatusBadge, Stars, Field, Empty, Logo } from '../../components/ui'
import { fmtDate, useMoney } from '../../lib/format'
import { FAQ } from '../../components/ChatWidget'
import { COMMUNES } from '../../lib/seed'

export function Tracking() {
  const [params] = useSearchParams()
  const [num, setNum] = useState(params.get('n') ?? '')
  const [phone, setPhone] = useState('')
  const [searched, setSearched] = useState(false)
  const orders = useStore((s) => s.orders)
  const money = useMoney()
  const digits = (x: string) => x.replace(/\D/g, '')
  const found = searched ? orders.find((o) => o.number.toLowerCase() === num.trim().toLowerCase() && digits(o.phone).endsWith(digits(phone).slice(-4)) && digits(phone).length >= 4) : undefined
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <PackageSearch size={40} className="mx-auto text-brand-700" />
        <h1 className="mt-2 text-3xl font-bold">Suivre un colis</h1>
        <p className="text-sm text-slate-500">Saisis ton numéro de commande et les 4 derniers chiffres de ton téléphone.</p>
      </div>
      <form className="card mt-6 grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); setSearched(true) }}>
        <Field label="N° de commande"><input className="input" placeholder="HHH-1150" value={num} onChange={(e) => setNum(e.target.value)} /></Field>
        <Field label="4 derniers chiffres"><input className="input" placeholder="1024" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <button className="btn-primary">Suivre</button>
      </form>
      {searched && !found && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-center text-sm text-rose-700">Aucune commande trouvée avec ces informations.</p>}
      {found && (
        <div className="card mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><div className="text-lg font-bold">{found.number}</div><div className="text-xs text-slate-500">Passée le {fmtDate(found.createdAt)} · {money(found.total)}</div></div>
            <StatusBadge status={found.status} />
          </div>
          <div className="my-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">Livraison prévue au plus tard le <b>{fmtDate(found.promisedDate)}</b></div>
          <OrderTimeline order={found} />
        </div>
      )}
      <p className="mt-6 text-center text-xs text-slate-400">Démo : essaie un numéro de commande de Grace avec « 1024 ».</p>
    </div>
  )
}

export function HowItWorks() {
  const steps = [
    { i: <ShoppingCart />, t: 'Commande', d: 'Tu choisis un article dans le catalogue ou tu colles un lien, puis tu valides. Un seul prix, tout compris.', who: 'Automatisé' },
    { i: <Smartphone />, t: 'Paiement', d: 'Tu paies en Mobile Money. Confirmation instantanée, sans carte bancaire internationale.', who: 'Automatisé' },
    { i: <Users />, t: 'Achat fournisseur', d: 'Notre équipe achète tes articles chez le fournisseur international et les fait livrer à notre adresse de réception.', who: 'Notre équipe' },
    { i: <Plane />, t: 'Transit international', d: 'Les colis sont groupés et expédiés vers Brazzaville par notre transitaire partenaire.', who: 'Partenaire' },
    { i: <Landmark />, t: 'Douane', d: 'Nous gérons le dédouanement et toutes les formalités. Rien à faire de ton côté.', who: 'Partenaire' },
    { i: <Truck />, t: 'Livraison locale', d: 'À domicile à Brazzaville et Pointe-Noire, ou dans un point relais proche de chez toi.', who: 'Partenaire local' },
  ]
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-center text-3xl font-bold">Comment ça marche</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">Un parcours 100 % digital pour toi. En coulisses, une équipe et des partenaires de confiance s’occupent de tout.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.t} className="card relative p-5">
            <span className="absolute right-4 top-4 text-4xl font-black text-slate-100">{i + 1}</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">{s.i}</div>
            <h3 className="mt-3 font-bold">{s.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            <span className="mt-3 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{s.who}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center gap-4 rounded-2xl bg-emerald-50 p-5">
        <Bell className="shrink-0 text-emerald-700" />
        <p className="text-sm text-emerald-900"><b>Tu es informée à chaque étape</b>, sans avoir à demander : notification WhatsApp, SMS ou e-mail dès que ta commande avance.</p>
      </div>
      <div className="mt-8 text-center"><Link to="/catalogue" className="btn-primary px-6 py-3">Commencer mes achats</Link></div>
    </div>
  )
}

export function Faq() {
  const settings = useStore((s) => s.settings)
  const money = useMoney()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Questions fréquentes</h1>
      <div className="mt-6 space-y-2">
        {FAQ.map((f, i) => (
          <div key={f.q} className="card">
            <button className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold" onClick={() => setOpen(open === i ? null : i)}>{f.q}<ChevronDown size={18} className={`shrink-0 transition ${open === i ? 'rotate-180' : ''}`} /></button>
            {open === i && <p className="px-4 pb-4 text-sm text-slate-600">{f.a}</p>}
          </div>
        ))}
      </div>
      <section id="retours" className="card mt-10 p-6">
        <h2 className="text-xl font-bold">Politique de retour et de réclamation</h2>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <p><b>Ce qui est couvert.</b> Article non conforme (taille, modèle), endommagé pendant le transport, ou manquant. Ouvre une réclamation depuis ta commande dans les <b>7 jours</b> suivant la réception, avec une photo.</p>
          <p><b>Solutions possibles.</b> Remboursement en Mobile Money, avoir sur ton compte, ou renvoi de l’article. Une provision financière dédiée garantit le traitement.</p>
          <p><b>Ce qui n’est pas couvert.</b> Le changement d’avis une fois l’achat lancé chez le fournisseur, et les écarts mineurs de couleur dus à l’écran.</p>
          <p><b>Annulation.</b> Gratuite tant que l’achat chez le fournisseur n’a pas été lancé.</p>
          <p><b>Délai.</b> Si ta commande dépasse la date promise, contacte-nous : nous te tenons informée et un geste commercial peut être accordé.</p>
          <p>Livraison : point relais {money(settings.relayDeliveryFee)}, domicile {money(settings.homeDeliveryFee)}. Contact : {settings.supportEmail}</p>
        </div>
      </section>
    </div>
  )
}

export function ReviewsPage() {
  const reviews = useStore((s) => s.reviews.filter((r) => r.status === 'publie'))
  const users = useStore((s) => s.users)
  const products = useStore((s) => s.products)
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }))
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Avis clients</h1>
      <p className="text-sm text-slate-500">Uniquement des avis de clients livrés (achat vérifié).</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_2.5fr]">
        <div className="card h-fit p-5 text-center">
          <div className="text-5xl font-extrabold">{avg.toFixed(1)}</div>
          <Stars value={Math.round(avg)} size={20} />
          <div className="mt-1 text-sm text-slate-500">{reviews.length} avis</div>
          <div className="mt-4 space-y-1">
            {dist.map((d) => (
              <div key={d.n} className="flex items-center gap-2 text-xs"><span className="w-3">{d.n}</span><Star size={11} className="fill-gold-500 text-gold-500" /><div className="h-2 flex-1 rounded bg-slate-100"><div className="h-2 rounded bg-gold-500" style={{ width: `${reviews.length ? (d.c / reviews.length) * 100 : 0}%` }} /></div><span className="w-5 text-right text-slate-400">{d.c}</span></div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {reviews.map((r) => {
            const u = users.find((x) => x.id === r.customerId)
            const p = products.find((x) => x.id === r.productId)
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-slate-400">{fmtDate(r.at)}</span></div>
                <p className="mt-2 text-sm text-slate-700">{r.comment}</p>
                <div className="mt-2 text-xs text-slate-500"><b>{u?.name.split(' ')[0]} {u?.name.split(' ')[1]?.[0]}.</b> · {u?.commune} {p && <>· <Link to={`/produit/${p.id}`} className="text-brand-700">{p.name}</Link></>} · <span className="text-emerald-700">Achat vérifié</span></div>
              </div>
            )
          })}
          {!reviews.length && <Empty title="Pas encore d’avis" />}
        </div>
      </div>
    </div>
  )
}

export function Login() {
  const [params] = useSearchParams()
  const next = params.get('next')
  const login = useStore((s) => s.login)
  const register = useStore((s) => s.register)
  const nav = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>(params.get('ref') ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [r, setR] = useState({ name: '', email: '', phone: '', password: '', commune: COMMUNES[0], referral: params.get('ref') ?? '' })
  const go = (role: string) => nav(next ?? (role === 'client' ? '/compte' : '/admin'))
  const doLogin = (e?: string, p?: string) => {
    const u = login(e ?? email, p ?? pw)
    if (!u) return setErr('E-mail ou mot de passe incorrect.')
    go(u.role)
  }
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <div className="card p-6">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          {(['login', 'register'] as const).map((t) => <button key={t} onClick={() => { setTab(t); setErr('') }} className={`rounded-lg py-2 text-sm font-semibold ${tab === t ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{t === 'login' ? 'Connexion' : 'Créer un compte'}</button>)}
        </div>
        {err && <p className="mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
        {tab === 'login' ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); doLogin() }}>
            <Field label="E-mail"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label="Mot de passe"><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
            <button className="btn-primary w-full py-3">Se connecter</button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault()
            const res = register(r)
            if (!res.ok) return setErr(res.error!)
            nav(next ?? '/compte')
          }}>
            <Field label="Nom complet"><input className="input" required value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
            <Field label="E-mail"><input className="input" type="email" required value={r.email} onChange={(e) => setR({ ...r, email: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Téléphone (Mobile Money)"><input className="input" required value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value })} placeholder="+242…" /></Field>
              <Field label="Commune"><select className="input" value={r.commune} onChange={(e) => setR({ ...r, commune: e.target.value })}>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <Field label="Mot de passe"><input className="input" type="password" minLength={6} required value={r.password} onChange={(e) => setR({ ...r, password: e.target.value })} /></Field>
            <Field label="Code parrainage (facultatif)"><input className="input" value={r.referral} onChange={(e) => setR({ ...r, referral: e.target.value })} placeholder="GRACE24" /></Field>
            <button className="btn-primary w-full py-3">Créer mon compte</button>
          </form>
        )}
      </div>
      <div className="card mt-5 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accès rapide démo</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ['Cliente (Grace)', 'grace@demo.cg', 'demo1234'],
            ['Administratrice', 'admin@hhhgroup.cg', 'admin1234'],
            ['Équipe achats', 'achats@hhhgroup.cg', 'ops1234'],
            ['Service client', 'support@hhhgroup.cg', 'support1234'],
          ].map(([l, e, p]) => <button key={e} className="btn-outline btn-sm" onClick={() => doLogin(e, p)}>{l}</button>)}
        </div>
      </div>
    </div>
  )
}
