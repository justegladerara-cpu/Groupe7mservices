import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useParams } from 'react-router-dom'
import { Package, Bell, Gift, User as UserIcon, MessageSquareWarning, Copy, Check, ChevronLeft, MessageCircle, Mail, Smartphone, Link2 } from 'lucide-react'
import { useStore, useCurrentUser, isStaff } from '../../lib/store'
import { OrderTimeline, StatusBadge, Empty, Stars, Field, Pill, Modal } from '../../components/ui'
import ProductVisual from '../../components/ProductVisual'
import { useMoney, fmtDate, fmtDateTime } from '../../lib/format'
import { CLAIM_REASON, CLAIM_STATUS, STATUS_FLOW } from '../../lib/constants'
import type { Claim } from '../../lib/types'
import { COMMUNES } from '../../lib/seed'

export function AccountLayout() {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/connexion?next=/compte" replace />
  if (isStaff(user)) return <Navigate to="/admin" replace />
  const tabs = [
    { to: '/compte', label: 'Mes commandes', icon: <Package size={16} />, end: true },
    { to: '/compte/notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { to: '/lien', label: 'Demandes par lien', icon: <Link2 size={16} /> },
    { to: '/compte/reclamations', label: 'Réclamations', icon: <MessageSquareWarning size={16} /> },
    { to: '/compte/parrainage', label: 'Parrainage', icon: <Gift size={16} /> },
    { to: '/compte/profil', label: 'Profil', icon: <UserIcon size={16} /> },
  ]
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Bonjour {user.name.split(' ')[0]} 👋</h1>
      <div className="mt-5 grid gap-6 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {tabs.map((t) => <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-white'}`}>{t.icon}{t.label}</NavLink>)}
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  )
}

export function MyOrders() {
  const user = useCurrentUser()!
  const orders = useStore((s) => s.orders.filter((o) => o.customerId === user.id))
  const money = useMoney()
  if (!orders.length) return <Empty icon={<Package size={32} />} title="Aucune commande" text="Ta première commande t’attend !" action={<Link to="/catalogue" className="btn-primary">Voir le catalogue</Link>} />
  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const step = STATUS_FLOW.indexOf(o.status)
        return (
          <Link key={o.id} to={`/compte/commandes/${o.id}`} className="card block p-4 hover:border-brand-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><span className="font-bold">{o.number}</span> <span className="text-xs text-slate-400">· {fmtDate(o.createdAt)}</span></div>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {o.items.slice(0, 4).map((i, k) => <div key={k} className="h-12 w-10 overflow-hidden rounded-lg"><ProductVisual glyph={i.glyph} hue={i.hue} image={i.image} /></div>)}
              <div className="ml-2 text-sm text-slate-600">{o.items.reduce((a, i) => a + i.qty, 0)} article(s)</div>
              <div className="ml-auto font-bold">{money(o.total)}</div>
            </div>
            {o.status !== 'annulee' && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(step / (STATUS_FLOW.length - 1)) * 100}%` }} /></div>
                <div className="mt-1 text-xs text-slate-500">{o.status === 'livree' ? `Livrée le ${fmtDate(o.deliveredAt)}` : `Livraison prévue au plus tard le ${fmtDate(o.promisedDate)}`}</div>
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export function MyOrderDetail() {
  const { id } = useParams()
  const user = useCurrentUser()!
  const o = useStore((s) => s.orders.find((x) => x.id === id && x.customerId === user.id))
  const relay = useStore((s) => s.relayPoints.find((r) => r.id === o?.relayPointId))
  const op = useStore((s) => s.operators.find((x) => x.id === o?.paymentOperator))
  const reviews = useStore((s) => s.reviews.filter((r) => r.orderId === id))
  const claims = useStore((s) => s.claims.filter((c) => c.orderId === id))
  const setStatus = useStore((s) => s.setStatus)
  const addReview = useStore((s) => s.addReview)
  const openClaim = useStore((s) => s.openClaim)
  const money = useMoney()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [claimOpen, setClaimOpen] = useState(false)
  const [reason, setReason] = useState<Claim['reason']>('non_conforme')
  const [desc, setDesc] = useState('')
  if (!o) return <Empty title="Commande introuvable" />
  const canCancel = o.status === 'attente_paiement' || o.status === 'paiement_confirme'
  return (
    <div className="space-y-5">
      <Link to="/compte" className="flex items-center gap-1 text-sm text-slate-500"><ChevronLeft size={16} />Mes commandes</Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-xl font-bold">{o.number}</h2><div className="text-xs text-slate-500">Passée le {fmtDateTime(o.createdAt)}</div></div>
          <StatusBadge status={o.status} />
        </div>
        {o.status === 'attente_paiement' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-4">
            <span className="text-sm text-amber-900">Paiement en attente — ta commande sera lancée dès réception.</span>
            <Link to={`/paiement/${o.id}`} className="btn-gold btn-sm">Payer {money(o.total)}</Link>
          </div>
        )}
        {o.status !== 'annulee' && o.status !== 'livree' && <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">Livraison prévue au plus tard le <b>{fmtDate(o.promisedDate)}</b></div>}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5"><h3 className="mb-4 font-bold">Suivi</h3><OrderTimeline order={o} /></div>
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-bold">Articles</h3>
            <div className="mt-3 space-y-3">
              {o.items.map((i, k) => (
                <div key={k} className="flex gap-3">
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg"><ProductVisual glyph={i.glyph} hue={i.hue} image={i.image} /></div>
                  <div className="flex-1 text-sm"><div className="font-medium">{i.name}</div><div className="text-xs text-slate-500">{[i.size, i.color, `× ${i.qty}`].filter(Boolean).join(' · ')}</div></div>
                  <div className="text-sm font-semibold">{money(i.unitPrice * i.qty)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Livraison {o.delivery === 'relais' ? 'point relais' : 'à domicile'}</span><span>{money(o.breakdown.delivery)}</span></div>
              {(o.breakdown.promo ?? 0) > 0 && <div className="flex justify-between text-emerald-700"><span>Code promo {o.promoCode}</span><span>−{money(o.breakdown.promo)}</span></div>}
              {o.breakdown.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Crédit utilisé</span><span>−{money(o.breakdown.discount)}</span></div>}
              <div className="flex justify-between text-base font-bold"><span>Total payé</span><span>{money(o.total)}</span></div>
            </div>
          </div>
          <div className="card space-y-2 p-5 text-sm">
            <div><span className="text-slate-500">Livraison : </span>{o.delivery === 'relais' ? <>{relay?.name}<div className="text-xs text-slate-500">{relay?.address} · {relay?.hours}</div></> : `${o.address ?? ''}, ${o.commune ?? ''}`}</div>
            <div><span className="text-slate-500">Paiement : </span>{op?.name}{o.paymentRef && ` · réf. ${o.paymentRef}`}</div>
            <div><span className="text-slate-500">Téléphone : </span>{o.phone}</div>
          </div>
          {canCancel && <button className="btn-outline w-full text-rose-600" onClick={() => setStatus(o.id, 'annulee', user.name, 'Annulée par le client')}>Annuler la commande</button>}
          {o.status === 'livree' && (
            <div className="card p-5">
              {reviews.length ? (
                <div><h3 className="font-bold">Ton avis</h3><Stars value={reviews[0].rating} /><p className="mt-1 text-sm text-slate-600">{reviews[0].comment}</p>{reviews[0].status === 'en_attente' && <Pill tone="amber">En cours de validation</Pill>}</div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); addReview({ orderId: o.id, productId: o.items[0].productId, rating, comment }) }}>
                  <h3 className="font-bold">Donne ton avis</h3>
                  <p className="text-xs text-slate-500">Il aide d’autres clientes à nous faire confiance.</p>
                  <div className="mt-2"><Stars value={rating} size={26} onChange={setRating} /></div>
                  <textarea className="input mt-2" rows={3} required placeholder="Ton expérience…" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <button className="btn-primary btn-sm mt-2">Publier</button>
                </form>
              )}
            </div>
          )}
          {(o.status === 'livree' || o.status === 'en_livraison' || new Date() > new Date(o.promisedDate)) && o.status !== 'annulee' && (
            <div className="card p-5">
              <h3 className="font-bold">Un problème ?</h3>
              {claims.map((c) => <Link key={c.id} to="/compte/reclamations" className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm"><span>{c.number} · {CLAIM_REASON[c.reason]}</span><Pill>{CLAIM_STATUS[c.status]}</Pill></Link>)}
              <button className="btn-outline btn-sm mt-3" onClick={() => setClaimOpen(true)}>Ouvrir une réclamation</button>
            </div>
          )}
        </div>
      </div>
      <Modal open={claimOpen} onClose={() => setClaimOpen(false)} title="Ouvrir une réclamation">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); openClaim({ orderId: o.id, reason, description: desc }); setClaimOpen(false); setDesc('') }}>
          <Field label="Motif"><select className="input" value={reason} onChange={(e) => setReason(e.target.value as Claim['reason'])}>{Object.entries(CLAIM_REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Description"><textarea className="input" rows={4} required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Décris le problème. Tu pourras envoyer une photo au service client sur WhatsApp." /></Field>
          <button className="btn-primary w-full">Envoyer</button>
        </form>
      </Modal>
    </div>
  )
}

const CH_ICON = { whatsapp: <MessageCircle size={12} />, sms: <Smartphone size={12} />, email: <Mail size={12} />, app: <Bell size={12} /> }

export function MyNotifications() {
  const user = useCurrentUser()!
  const list = useStore((s) => s.notifications.filter((n) => n.customerId === user.id))
  const markRead = useStore((s) => s.markNotificationsRead)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Notifications</h2><button className="btn-ghost btn-sm" onClick={() => markRead(user.id)}>Tout marquer comme lu</button></div>
      {!list.length && <Empty icon={<Bell size={28} />} title="Aucune notification" />}
      <div className="space-y-2">
        {list.map((n) => (
          <div key={n.id} className={`card p-4 ${!n.read ? 'border-brand-300 bg-brand-50/40' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-slate-800">{n.title}</div>
              <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(n.at)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{n.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              Envoyé par : {n.channels.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5">{CH_ICON[c]}{c === 'app' ? 'appli' : c === 'whatsapp' ? 'WhatsApp' : c.toUpperCase()}</span>)}
              {n.orderId && <Link to={`/compte/commandes/${n.orderId}`} className="ml-auto font-semibold text-brand-700">Voir →</Link>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MyClaims() {
  const user = useCurrentUser()!
  const claims = useStore((s) => s.claims.filter((c) => c.customerId === user.id))
  const orders = useStore((s) => s.orders)
  const reply = useStore((s) => s.replyClaim)
  const money = useMoney()
  const [text, setText] = useState<Record<string, string>>({})
  if (!claims.length) return <Empty icon={<MessageSquareWarning size={28} />} title="Aucune réclamation" text="Tu peux ouvrir une réclamation depuis le détail d’une commande livrée." />
  return (
    <div className="space-y-4">
      {claims.map((c) => (
        <div key={c.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><b>{c.number}</b> · {CLAIM_REASON[c.reason]} <span className="text-xs text-slate-400">· commande {orders.find((o) => o.id === c.orderId)?.number}</span></div>
            <Pill tone={c.status === 'resolue' ? 'green' : c.status === 'rejetee' ? 'slate' : 'amber'}>{CLAIM_STATUS[c.status]}</Pill>
          </div>
          {c.resolution && c.resolution !== 'aucune' && <div className="mt-2 text-sm text-emerald-700">Solution : {c.resolution}{c.refundAmount ? ` (${money(c.refundAmount)})` : ''}</div>}
          <div className="mt-3 space-y-2">
            {c.messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'client' ? 'justify-end' : ''}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === 'client' ? 'bg-brand-700 text-white' : 'bg-slate-100'}`}>{m.text}<div className={`mt-1 text-[10px] ${m.from === 'client' ? 'text-brand-200' : 'text-slate-400'}`}>{m.author} · {fmtDateTime(m.at)}</div></div>
              </div>
            ))}
          </div>
          {(c.status === 'ouverte' || c.status === 'en_cours') && (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text[c.id]) { reply(c.id, 'client', user.name, text[c.id]); setText({ ...text, [c.id]: '' }) } }}>
              <input className="input" placeholder="Ta réponse…" value={text[c.id] ?? ''} onChange={(e) => setText({ ...text, [c.id]: e.target.value })} />
              <button className="btn-primary">Envoyer</button>
            </form>
          )}
        </div>
      ))}
    </div>
  )
}

export function Referral() {
  const user = useCurrentUser()!
  const settings = useStore((s) => s.settings)
  const filleuls = useStore((s) => s.users.filter((u) => u.referredBy === user.referralCode))
  const orders = useStore((s) => s.orders)
  const money = useMoney()
  const [copied, setCopied] = useState(false)
  const link = `${window.location.href.split('#')[0]}#/connexion?ref=${user.referralCode}`
  const copy = () => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-950 p-6 text-white">
        <Gift className="text-gold-400" />
        <h2 className="mt-2 text-2xl font-bold">Invite tes amies, gagnez toutes les deux</h2>
        <p className="mt-1 text-sm text-brand-100">Ton amie reçoit {money(settings.referralWelcome)} sur sa première commande. Tu reçois {money(settings.referralReward)} de crédit dès qu’elle a payé.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-white/10 px-4 py-2 font-mono text-lg font-bold tracking-wider">{user.referralCode}</span>
          <button className="btn bg-white text-brand-800 hover:bg-brand-50" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Lien copié' : 'Copier mon lien'}</button>
          <a className="btn bg-emerald-500 text-white hover:bg-emerald-600" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`J’achète sur SHEIN et je paie en Mobile Money avec HHHGroup ! Inscris-toi avec mon code ${user.referralCode} : ${link}`)}`}><MessageCircle size={16} />Partager sur WhatsApp</a>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="text-xs uppercase text-slate-500">Crédit disponible</div><div className="text-2xl font-bold text-emerald-700">{money(user.credit)}</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-slate-500">Amies inscrites</div><div className="text-2xl font-bold">{filleuls.length}</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-slate-500">Ont commandé</div><div className="text-2xl font-bold">{filleuls.filter((f) => orders.some((o) => o.customerId === f.id && o.paidAt)).length}</div></div>
      </div>
      {filleuls.length > 0 && <div className="card divide-y divide-slate-100">{filleuls.map((f) => <div key={f.id} className="flex justify-between p-3 text-sm"><span>{f.name.split(' ')[0]} {f.name.split(' ')[1]?.[0]}.</span><span className="text-slate-500">inscrite le {fmtDate(f.createdAt)}</span></div>)}</div>}
    </div>
  )
}

export function Profile() {
  const user = useCurrentUser()!
  const update = useStore((s) => s.updateProfile)
  const [f, setF] = useState({ name: user.name, phone: user.phone, commune: user.commune ?? '', address: user.address ?? '' })
  const [ok, setOk] = useState(false)
  return (
    <form className="card max-w-xl space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); update(f); setOk(true) }}>
      <h2 className="text-lg font-bold">Mon profil</h2>
      <Field label="Nom"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="E-mail"><input className="input bg-slate-50" value={user.email} disabled /></Field>
      <Field label="Téléphone (Mobile Money / WhatsApp)"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Field label="Commune"><select className="input" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })}>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Adresse"><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      </div>
      <button className="btn-primary">{ok ? <><Check size={16} />Enregistré</> : 'Enregistrer'}</button>
    </form>
  )
}
