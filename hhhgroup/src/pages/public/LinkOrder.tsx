import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Link2, Sparkles, Clock, CheckCircle2, XCircle, ShoppingBag } from 'lucide-react'
import { useStore, useCurrentUser } from '../../lib/store'
import { allInclusiveUnitPrice } from '../../lib/pricing'
import { useMoney, fmtDateTime } from '../../lib/format'
import { Field, Pill } from '../../components/ui'
import { LINK_STATUS } from '../../lib/constants'

export const WEIGHTS: Record<string, number> = { Vêtement: 0.4, Chaussures: 0.9, 'Sac / accessoire': 0.5, 'Beauté / parfum': 0.3, 'Bijou / montre': 0.15, 'Électronique': 0.5, 'Maison': 0.8 }

export default function LinkOrder() {
  const user = useCurrentUser()
  const settings = useStore((s) => s.settings)
  const suppliers = useStore((s) => s.suppliers)
  const submit = useStore((s) => s.submitLink)
  const respond = useStore((s) => s.respondLink)
  const mine = useStore((s) => s.linkRequests.filter((l) => l.customerId === user?.id))
  const money = useMoney()
  const nav = useNavigate()
  const [f, setF] = useState({ url: '', title: '', size: '', color: '', qty: 1, clientNote: '', seenPrice: '', kind: 'Vêtement' })
  const [sent, setSent] = useState('')
  const detected = suppliers.find((s) => f.url && s.domains.some((d) => f.url.toLowerCase().includes(d)))
  const validUrl = /^https?:\/\/.+\..+/.test(f.url.trim())
  const estimate = Number(f.seenPrice) > 0 ? allInclusiveUnitPrice(Number(f.seenPrice), WEIGHTS[f.kind], settings) * f.qty : 0

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return nav('/connexion?next=/lien')
    const l = submit({ url: f.url.trim(), title: f.title || 'Article sans titre', size: f.size || undefined, color: f.color || undefined, qty: f.qty, clientNote: [f.clientNote, f.seenPrice ? `Prix vu sur le site : ${f.seenPrice} $` : ''].filter(Boolean).join(' — ') || undefined })
    setSent(l.number)
    setF({ url: '', title: '', size: '', color: '', qty: 1, clientNote: '', seenPrice: '', kind: 'Vêtement' })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 text-slate-900"><Link2 /></div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commander avec un lien</h1>
          <p className="text-sm text-slate-500">Un article vu sur SHEIN, AliExpress ou ailleurs ? Colle le lien, on te donne le prix tout compris.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={onSubmit} className="card space-y-4 p-5">
          {sent && <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />Demande {sent} envoyée ! Tu recevras le prix tout compris par notification (en général le jour même).</div>}
          <Field label="Lien de l’article *">
            <input className="input" required placeholder="https://www.shein.com/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
          </Field>
          {f.url && <div className="-mt-2 text-xs">{validUrl ? (detected ? <span className="text-emerald-700">Boutique reconnue : <b>{detected.name}</b></span> : <span className="text-amber-700">Boutique non reconnue — notre équipe vérifiera la faisabilité.</span>) : <span className="text-rose-600">Le lien doit commencer par https://</span>}</div>}
          <Field label="Nom de l’article"><input className="input" placeholder="Ex. Robe longue satinée verte" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Taille"><input className="input" placeholder="M" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} /></Field>
            <Field label="Couleur"><input className="input" placeholder="Noir" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
            <Field label="Quantité"><input type="number" min={1} max={10} className="input" value={f.qty} onChange={(e) => setF({ ...f, qty: Math.max(1, Number(e.target.value)) })} /></Field>
          </div>
          <Field label="Message pour l’équipe"><textarea className="input" rows={2} placeholder="Précisions éventuelles…" value={f.clientNote} onChange={(e) => setF({ ...f, clientNote: e.target.value })} /></Field>
          <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-800"><Sparkles size={16} />Estimation instantanée (facultatif)</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Prix affiché ($ USD)"><input className="input" type="number" step="0.01" min={0} placeholder="14.99" value={f.seenPrice} onChange={(e) => setF({ ...f, seenPrice: e.target.value })} /></Field>
              <Field label="Type d’article"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.keys(WEIGHTS).map((k) => <option key={k}>{k}</option>)}</select></Field>
            </div>
            {estimate > 0 && <div className="mt-3 text-sm">Estimation tout compris : <b className="text-lg text-brand-800">≈ {money(estimate)}</b><div className="text-xs text-slate-500">Indicatif. Le prix définitif est confirmé par l’équipe avant paiement.</div></div>}
          </div>
          <button disabled={!validUrl} className="btn-primary w-full py-3">{user ? 'Demander le prix tout compris' : 'Se connecter pour envoyer'}</button>
        </form>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold">Comment ça marche ?</h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-600">
              <li><b className="text-slate-800">1.</b> Tu colles le lien et précises taille/couleur.</li>
              <li><b className="text-slate-800">2.</b> L’équipe vérifie et t’envoie un prix unique, tout compris (valable {settings.quoteValidityDays} jours).</li>
              <li><b className="text-slate-800">3.</b> Tu acceptes : l’article passe au panier, tu paies en Mobile Money.</li>
            </ol>
          </div>
          {user && (
            <div className="card p-5">
              <h2 className="font-bold">Mes demandes</h2>
              {mine.length === 0 && <p className="mt-2 text-sm text-slate-500">Aucune demande pour l’instant.</p>}
              <div className="mt-3 space-y-3">
                {mine.map((l) => (
                  <div key={l.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{l.title}</div>
                        <div className="text-xs text-slate-400">{l.number} · {fmtDateTime(l.createdAt)}</div>
                      </div>
                      <Pill tone={l.status === 'chiffree' ? 'violet' : l.status === 'acceptee' ? 'green' : l.status === 'nouvelle' ? 'amber' : 'slate'}>{l.status === 'nouvelle' ? <Clock size={11} /> : null}{LINK_STATUS[l.status]}</Pill>
                    </div>
                    {l.status === 'chiffree' && l.quotedUnitPrice && (
                      <div className="mt-3 rounded-lg bg-brand-50 p-3">
                        <div className="text-sm">Prix tout compris : <b className="text-brand-800">{money(l.quotedUnitPrice * l.qty)}</b></div>
                        {l.adminNote && <div className="mt-1 text-xs text-slate-600">{l.adminNote}</div>}
                        <div className="mt-2 flex gap-2">
                          <button className="btn-primary btn-sm" onClick={() => { respond(l.id, true); nav('/panier') }}><ShoppingBag size={14} />Accepter</button>
                          <button className="btn-outline btn-sm" onClick={() => respond(l.id, false)}><XCircle size={14} />Refuser</button>
                        </div>
                      </div>
                    )}
                    {l.orderId && <Link to={`/compte/commandes/${l.orderId}`} className="mt-2 block text-xs font-semibold text-brand-700">Voir la commande →</Link>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
