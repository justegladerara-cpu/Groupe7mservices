import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, Home, Store, Zap, Smartphone, ShieldCheck, Lock, CheckCircle2, Loader2 } from 'lucide-react'
import { useStore, useCurrentUser } from '../../lib/store'
import ProductVisual from '../../components/ProductVisual'
import { computeBreakdown, deliveryWindow } from '../../lib/pricing'
import { useMoney, fmtDate } from '../../lib/format'
import { Empty, Field, DemoBanner, StatusBadge } from '../../components/ui'
import type { DeliveryMode } from '../../lib/types'
import { COMMUNES } from '../../lib/seed'

export function Cart() {
  const cart = useStore((s) => s.cart)
  const items = useStore((s) => s.cartItems)()
  const setQty = useStore((s) => s.setCartQty)
  const removeLine = useStore((s) => s.removeFromCart)
  const settings = useStore((s) => s.settings)
  const user = useCurrentUser()
  const money = useMoney()
  const nav = useNavigate()
  const subtotal = items.reduce((a, i) => a + i.unitPrice * i.qty, 0)
  if (!cart.length) return <div className="mx-auto max-w-3xl px-4 py-16"><Empty icon={<ShoppingBag size={36} />} title="Ton panier est vide" text="Parcours le catalogue ou colle le lien d’un article." action={<Link to="/catalogue" className="btn-primary">Voir le catalogue</Link>} /></div>
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Mon panier</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {cart.map((c, idx) => {
            const it = items[idx]
            if (!it) return null
            return (
              <div key={c.key} className="card flex gap-3 p-3">
                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl"><ProductVisual glyph={it.glyph} hue={it.hue} image={it.image} /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800">{it.name}</div>
                  <div className="text-xs text-slate-500">{[it.size && `Taille ${it.size}`, it.color].filter(Boolean).join(' · ')}{it.linkRequestId && ' · Commande par lien'}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-lg border border-slate-300">
                      <button className="p-1.5" onClick={() => setQty(c.key, c.qty - 1)}><Minus size={14} /></button>
                      <span className="w-8 text-center text-sm font-semibold">{c.qty}</span>
                      <button className="p-1.5" onClick={() => setQty(c.key, c.qty + 1)}><Plus size={14} /></button>
                    </div>
                    <div className="font-bold">{money(it.unitPrice * it.qty)}</div>
                  </div>
                </div>
                <button onClick={() => removeLine(c.key)} className="self-start p-1 text-slate-400 hover:text-rose-600" aria-label="Retirer"><Trash2 size={16} /></button>
              </div>
            )
          })}
        </div>
        <div className="card h-fit p-5">
          <div className="flex justify-between text-sm"><span>Articles (tout compris)</span><b>{money(subtotal)}</b></div>
          <div className="mt-1 flex justify-between text-sm text-slate-500"><span>Livraison point relais</span><span>{subtotal >= settings.freeRelayThreshold ? <b className="text-emerald-700">Offerte</b> : `dès ${money(settings.relayDeliveryFee)}`}</span></div>
          <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            {subtotal >= settings.freeRelayThreshold ? 'Bravo, la livraison en point relais est offerte !' : <>Plus que <b>{money(settings.freeRelayThreshold - subtotal)}</b> pour la livraison en point relais offerte</>}
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-200"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (subtotal / settings.freeRelayThreshold) * 100)}%` }} /></div>
          </div>
          <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">Transport international et douane déjà inclus. Aucun frais surprise.</p>
          <button className="btn-primary mt-4 w-full py-3" onClick={() => nav(user ? '/commande' : '/connexion?next=/commande')}>Passer la commande</button>
          <Link to="/catalogue" className="btn-ghost mt-2 w-full">Continuer mes achats</Link>
        </div>
      </div>
    </div>
  )
}

export function Checkout() {
  const user = useCurrentUser()
  const items = useStore((s) => s.cartItems)()
  const settings = useStore((s) => s.settings)
  const relayPoints = useStore((s) => s.relayPoints.filter((r) => r.active))
  const operators = useStore((s) => s.operators.filter((o) => o.active))
  const placeOrder = useStore((s) => s.placeOrder)
  const money = useMoney()
  const nav = useNavigate()
  const [mode, setMode] = useState<DeliveryMode>('relais')
  const [relay, setRelay] = useState(relayPoints[0]?.id ?? '')
  const [commune, setCommune] = useState(user?.commune ?? COMMUNES[0])
  const [address, setAddress] = useState(user?.address ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [op, setOp] = useState(operators[0]?.id ?? '')
  const [useCredit, setUseCredit] = useState(true)
  const [accept, setAccept] = useState(false)
  const checkPromo = useStore((s) => s.checkPromo)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ code: string; pct: number } | null>(null)
  const [promoMsg, setPromoMsg] = useState('')
  if (!user) return null
  if (!items.length) return <div className="mx-auto max-w-3xl px-4 py-16"><Empty title="Ton panier est vide" action={<Link to="/catalogue" className="btn-primary">Voir le catalogue</Link>} /></div>
  const itemsTotal = items.reduce((a, i) => a + i.unitPrice * i.qty, 0)
  const b = computeBreakdown(items, mode, settings, useCredit ? user.credit : 0, promo?.pct ?? 0)
  const applyPromo = () => { const r = checkPromo(promoInput, itemsTotal); setPromoMsg(r.message); setPromo(r.ok ? { code: promoInput.trim().toUpperCase(), pct: r.pct } : null) }
  const eta = new Date(); eta.setDate(eta.getDate() + (mode === 'express' ? settings.expressDaysMax : settings.standardDaysMax))
  const valid = accept && phone.length >= 9 && op && (mode === 'relais' ? !!relay : address.length > 3)
  const opName = operators.find((o) => o.id === op)?.short ?? 'Mobile Money'

  const submit = () => {
    const o = placeOrder({ delivery: mode, relayPointId: mode === 'relais' ? relay : undefined, commune: mode === 'relais' ? relayPoints.find((r) => r.id === relay)?.commune : commune, address: mode === 'relais' ? undefined : address, phone, operator: op, useCredit, promoCode: promo?.code })
    nav(`/paiement/${o.id}`)
  }

  const ModeCard = ({ m, icon, title, desc, price, disabled }: { m: DeliveryMode; icon: React.ReactNode; title: string; desc: string; price: string; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => setMode(m)} className={`relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${mode === m ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-white'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <div className="mt-0.5 text-brand-700">{icon}</div>
      <div className="flex-1"><div className="font-semibold">{title}</div><div className="text-xs text-slate-500">{desc}</div></div>
      <div className="text-sm font-bold">{price}</div>
      {disabled && <span className="absolute -top-2 right-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white">Bientôt</span>}
    </button>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Finaliser ma commande</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold">1. Livraison</h2>
            <div className="mt-3 space-y-2">
              <ModeCard m="relais" icon={<Store size={20} />} title="Point relais" desc={`Standard ${deliveryWindow('relais', settings)} · moins cher`} price={money(settings.relayDeliveryFee)} />
              <ModeCard m="domicile" icon={<Home size={20} />} title="À domicile" desc={`Standard ${deliveryWindow('domicile', settings)} · Brazzaville & Pointe-Noire`} price={money(settings.homeDeliveryFee)} />
              <ModeCard m="express" icon={<Zap size={20} />} title="Express" desc={`${deliveryWindow('express', settings)} · à domicile`} price={`+${settings.expressSurchargePct} % transport`} disabled={!settings.expressEnabled} />
            </div>
            {mode === 'relais' ? (
              <div className="mt-4"><Field label="Point relais">
                <select className="input" value={relay} onChange={(e) => setRelay(e.target.value)}>{relayPoints.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              </Field>
              {relay && <p className="mt-1 text-xs text-slate-500">{relayPoints.find((r) => r.id === relay)?.address} · {relayPoints.find((r) => r.id === relay)?.hours}</p>}</div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Field label="Commune"><select className="input" value={commune} onChange={(e) => setCommune(e.target.value)}>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Adresse / repère"><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="N°, avenue, quartier, repère" /></Field>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-bold">2. Paiement Mobile Money</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {operators.map((o) => (
                <button key={o.id} type="button" onClick={() => setOp(o.id)} className={`rounded-xl border p-3 text-center text-sm font-semibold ${op === o.id ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200'}`}>
                  <span className="mx-auto mb-1 block h-2 w-8 rounded-full" style={{ background: o.color }} />{o.short}
                </button>
              ))}
            </div>
            <div className="mt-4"><Field label="Numéro Mobile Money" hint="Tu recevras aussi les notifications de suivi sur ce numéro (WhatsApp/SMS)."><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+242 06 xxx xxxx" /></Field></div>
          </section>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-700" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>J’ai lu la <Link to="/faq#retours" className="font-semibold text-brand-700 underline">politique de retour et de réclamation</Link> : article non conforme, endommagé ou manquant = remboursement, avoir ou renvoi. Pas de retour pour changement d’avis une fois l’achat lancé.</span>
          </label>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="font-bold">Récapitulatif</h2>
          <div className="mt-3 space-y-2">
            {items.map((i, k) => <div key={k} className="flex justify-between gap-2 text-sm"><span className="truncate text-slate-600">{i.qty} × {i.name}</span><span className="whitespace-nowrap">{money(i.unitPrice * i.qty)}</span></div>)}
          </div>
          <div className="my-3 border-t border-dashed border-slate-200" />
          <div className="flex justify-between text-sm"><span className="text-slate-600">Livraison {mode === 'relais' ? 'point relais' : mode === 'express' ? 'express' : 'à domicile'}</span><span>{b.total + b.discount + b.promo - itemsTotal === 0 ? <b className="text-emerald-700">Offerte</b> : money(b.total + b.discount + b.promo - itemsTotal)}</span></div>
          {b.promo > 0 && <div className="mt-1 flex justify-between text-sm text-emerald-700"><span>Code {promo?.code} (−{promo?.pct} %)</span><span>−{money(b.promo)}</span></div>}
          <div className="mt-3 flex gap-2">
            <input id="promo-code" className="input py-1.5 text-sm uppercase" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Code promo" />
            <button type="button" className="btn-outline btn-sm" onClick={applyPromo}>Appliquer</button>
          </div>
          {promoMsg && <p className={`mt-1 text-xs ${promo ? 'text-emerald-700' : 'text-rose-600'}`}>{promoMsg}</p>}
          {user.credit > 0 && (
            <label className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2"><input type="checkbox" className="accent-brand-700" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />Utiliser mon crédit ({money(user.credit)})</span>
              {useCredit && <span className="text-emerald-700">−{money(b.discount)}</span>}
            </label>
          )}
          <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
            <div className="text-xs uppercase tracking-wide text-slate-400">Total unique à payer</div>
            <div className="text-3xl font-extrabold">{money(b.total)}</div>
            <div className="mt-1 text-xs text-slate-300">Produit, service, transport, douane et livraison inclus</div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Livraison au plus tard le <b>{fmtDate(eta.toISOString())}</b></div>
          <button disabled={!valid} onClick={submit} className="btn-gold mt-4 w-full py-3 text-base"><Smartphone size={18} />Payer {money(b.total)} avec {opName}</button>
          <div className="mt-3 flex items-center justify-center gap-1 text-xs text-slate-400"><Lock size={12} />Paiement sécurisé · <ShieldCheck size={12} />Achat protégé</div>
        </aside>
      </div>
    </div>
  )
}

export function Payment() {
  const { id } = useParams()
  const order = useStore((s) => s.orders.find((o) => o.id === id))
  const op = useStore((s) => s.operators.find((o) => o.id === order?.paymentOperator))
  const simulate = useStore((s) => s.simulatePayment)
  const money = useMoney()
  const [loading, setLoading] = useState(false)
  if (!order) return <div className="mx-auto max-w-xl px-4 py-16"><Empty title="Commande introuvable" /></div>
  const paid = order.status !== 'attente_paiement'
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-center text-white">
          {paid ? <CheckCircle2 size={48} className="mx-auto text-emerald-400" /> : <Smartphone size={48} className="mx-auto text-gold-400" />}
          <h1 className="mt-3 text-2xl font-bold">{paid ? 'Paiement confirmé !' : 'Confirme le paiement sur ton téléphone'}</h1>
          <p className="mt-1 text-sm text-brand-100">Commande {order.number} · {money(order.total)}</p>
        </div>
        <div className="space-y-4 p-6">
          {!paid ? (
            <>
              <ol className="space-y-2 text-sm text-slate-600">
                <li>1. Une demande de paiement {op?.short} est envoyée au <b>{order.phone}</b>.</li>
                <li>2. Saisis ton code PIN Mobile Money pour valider.</li>
                <li>3. La confirmation est instantanée, ta commande est lancée.</li>
              </ol>
              <DemoBanner><b>Mode démonstration.</b> Le raccordement Mobile Money (agrégateur de paiement) sera branché ici plus tard. Pour la démo, simule la confirmation de l’opérateur :</DemoBanner>
              <button className="btn-primary w-full py-3" disabled={loading} onClick={() => { setLoading(true); setTimeout(() => { simulate(order.id); setLoading(false) }, 1200) }}>
                {loading ? <><Loader2 size={18} className="animate-spin" />Attente de l’opérateur…</> : 'Simuler la confirmation du paiement'}
              </button>
              <Link to={`/compte/commandes/${order.id}`} className="btn-ghost w-full">Payer plus tard</Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>Statut</span><StatusBadge status={order.status} /></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>Référence</span><b>{order.paymentRef}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>Livraison au plus tard</span><b>{fmtDate(order.promisedDate)}</b></div>
              <p className="text-sm text-slate-600">Tu recevras une notification WhatsApp / SMS à chaque étape. Tu n’as rien d’autre à faire.</p>
              <Link to={`/compte/commandes/${order.id}`} className="btn-primary w-full py-3">Suivre ma commande</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
