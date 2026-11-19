import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Search, ExternalLink, MessageCircle, ChevronLeft, Download } from 'lucide-react'
import { useStore, useCurrentUser } from '../../lib/store'
import { PageTitle, StatusBadge, OrderTimeline, Pill, Modal, Field, Empty } from '../../components/ui'
import ProductVisual from '../../components/ProductVisual'
import { useMoney, fmtDate, fmtDateTime, waLink } from '../../lib/format'
import { STATUS_LABEL, LINK_STATUS, STATUS_FLOW } from '../../lib/constants'
import { orderEconomics, allInclusiveUnitPrice, unitCostParts } from '../../lib/pricing'
import type { OrderStatus } from '../../lib/types'

export function OrdersList() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const [q, setQ] = useState('')
  const orders = useStore((s) => s.orders)
  const users = useStore((s) => s.users)
  const money = useMoney()
  const list = useMemo(() => orders.filter((o) => {
    if (status && o.status !== status) return false
    if (!q) return true
    const u = users.find((x) => x.id === o.customerId)
    return `${o.number} ${u?.name} ${o.phone}`.toLowerCase().includes(q.toLowerCase())
  }), [orders, users, status, q])

  const exportCsv = () => {
    const rows = [['Numéro', 'Date', 'Client', 'Téléphone', 'Statut', 'Livraison', 'Total', 'Marge nette'], ...list.map((o) => {
      const u = users.find((x) => x.id === o.customerId)
      return [o.number, fmtDate(o.createdAt), u?.name ?? '', o.phone, STATUS_LABEL[o.status], o.delivery, String(o.total), String(Math.round(orderEconomics(o).margin))]
    })]
    const blob = new Blob(['﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'commandes-hhhgroup.csv'; a.click()
  }

  return (
    <div>
      <PageTitle title="Commandes" sub={`${list.length} commande(s)`} actions={<button className="btn-outline btn-sm" onClick={exportCsv}><Download size={14} />Exporter CSV</button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="N° de commande, client, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setParams({})} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${!status ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Toutes ({orders.length})</button>
        {([...STATUS_FLOW, 'annulee'] as OrderStatus[]).map((s) => <button key={s} onClick={() => setParams({ status: s })} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${status === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{STATUS_LABEL[s]} ({orders.filter((o) => o.status === s).length})</button>)}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-100 bg-slate-50"><tr><th className="table-head">Commande</th><th className="table-head">Client</th><th className="table-head">Articles</th><th className="table-head">Total</th><th className="table-head">Marge</th><th className="table-head">Statut</th><th className="table-head">Promis le</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.slice(0, 200).map((o) => {
              const u = users.find((x) => x.id === o.customerId)
              const e = orderEconomics(o)
              const late = !['livree', 'annulee'].includes(o.status) && new Date(o.promisedDate) < new Date()
              return (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="table-cell"><Link to={`/admin/commandes/${o.id}`} className="font-semibold text-brand-700">{o.number}</Link><div className="text-xs text-slate-400">{fmtDate(o.createdAt)}</div></td>
                  <td className="table-cell">{u?.name}<div className="text-xs text-slate-400">{o.delivery === 'relais' ? 'Point relais' : o.commune}</div></td>
                  <td className="table-cell">{o.items.reduce((a, i) => a + i.qty, 0)}</td>
                  <td className="table-cell font-semibold">{money(o.total)}</td>
                  <td className="table-cell"><span className={e.marginPct >= 25 ? 'text-emerald-700' : 'text-amber-700'}>{e.marginPct.toFixed(0)} %</span>{!e.isReal && <span className="ml-1 text-[10px] text-slate-400">est.</span>}</td>
                  <td className="table-cell"><StatusBadge status={o.status} /></td>
                  <td className={`table-cell text-xs ${late ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>{fmtDate(o.promisedDate)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!list.length && <div className="p-8 text-center text-sm text-slate-500">Aucune commande.</div>}
      </div>
    </div>
  )
}

export function OrderAdmin() {
  const { id } = useParams()
  const me = useCurrentUser()!
  const o = useStore((s) => s.orders.find((x) => x.id === id))
  const customer = useStore((s) => s.users.find((u) => u.id === o?.customerId))
  const suppliers = useStore((s) => s.suppliers)
  const relay = useStore((s) => s.relayPoints.find((r) => r.id === o?.relayPointId))
  const batch = useStore((s) => s.batches.find((b) => b.id === o?.purchaseBatchId))
  const shipment = useStore((s) => s.shipments.find((b) => b.id === o?.shipmentId))
  const courier = useStore((s) => s.couriers.find((c) => c.id === o?.courierId))
  const notifs = useStore((s) => s.notifications.filter((n) => n.orderId === id))
  const op = useStore((s) => s.operators.find((x) => x.id === o?.paymentOperator))
  const { simulatePayment, setStatus, updateOrder } = useStore((s) => ({ simulatePayment: s.simulatePayment, setStatus: s.setStatus, updateOrder: s.updateOrder }))
  const money = useMoney()
  const [note, setNote] = useState(o?.internalNotes ?? '')
  const [costs, setCosts] = useState(false)
  const [rc, setRc] = useState({ product: o?.realCosts.product ?? 0, transport: o?.realCosts.transport ?? 0, customs: o?.realCosts.customs ?? 0, delivery: o?.realCosts.delivery ?? 0 })
  if (!o) return <Empty title="Commande introuvable" />
  const e = orderEconomics(o)
  const lastNotif = notifs[0]
  return (
    <div>
      <Link to="/admin/commandes" className="mb-3 flex items-center gap-1 text-sm text-slate-500"><ChevronLeft size={16} />Commandes</Link>
      <PageTitle title={`Commande ${o.number}`} sub={`Créée le ${fmtDateTime(o.createdAt)} · promis au plus tard le ${fmtDate(o.promisedDate)}`} actions={<StatusBadge status={o.status} />} />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-bold">Articles à acheter</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {o.items.map((i, k) => {
                const sup = suppliers.find((s) => s.id === i.supplierId)
                return (
                  <div key={k} className="flex gap-3 py-3">
                    <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg"><ProductVisual glyph={i.glyph} hue={i.hue} image={i.image} /></div>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-semibold">{i.name}</div>
                      <div className="text-xs text-slate-500">{[i.size && `Taille ${i.size}`, i.color, `Qté ${i.qty}`].filter(Boolean).join(' · ')}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><Pill tone="violet">{sup?.name}</Pill><span>{i.supplierPriceUsd.toFixed(2)} $ · {i.weightKg} kg</span>{i.supplierUrl && <a href={i.supplierUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700">Ouvrir chez le fournisseur<ExternalLink size={11} /></a>}</div>
                    </div>
                    <div className="text-right text-sm font-semibold">{money(i.unitPrice * i.qty)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold">Rentabilité de la commande</h3><button className="btn-outline btn-sm" onClick={() => setCosts(true)}>Saisir coûts réels</button></div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-500"><th className="py-1 text-left">Poste</th><th className="py-1 text-right">Prévu</th><th className="py-1 text-right">Réel</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {([['Produit (fournisseur)', o.breakdown.productCost, o.realCosts.product], ['Transport international', o.breakdown.transport, o.realCosts.transport], ['Douane', o.breakdown.customs, o.realCosts.customs], ['Livraison locale', o.breakdown.delivery, o.realCosts.delivery]] as const).map(([l, est, real]) => (
                    <tr key={l}><td className="py-1.5">{l}</td><td className="py-1.5 text-right text-slate-500">{money(est)}</td><td className="py-1.5 text-right font-medium">{real !== undefined ? money(real) : <span className="text-slate-300">—</span>}</td></tr>
                  ))}
                  <tr><td className="py-1.5">Frais de service (inclus dans le prix)</td><td className="py-1.5 text-right text-slate-500">{money(o.breakdown.serviceFee)}</td><td /></tr>
                  {(o.breakdown.promo ?? 0) > 0 && <tr><td className="py-1.5">Code promo {o.promoCode}</td><td className="py-1.5 text-right text-slate-500">−{money(o.breakdown.promo)}</td><td /></tr>}
                  {o.breakdown.discount > 0 && <tr><td className="py-1.5">Crédit parrainage utilisé</td><td className="py-1.5 text-right text-slate-500">−{money(o.breakdown.discount)}</td><td /></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-2"><div className="text-xs text-slate-500">Encaissé</div><div className="font-bold">{money(e.revenue)}</div></div>
              <div className="rounded-xl bg-slate-50 p-2"><div className="text-xs text-slate-500">Coût {e.isReal ? 'réel' : 'estimé'}</div><div className="font-bold">{money(e.cost)}</div></div>
              <div className={`rounded-xl p-2 ${e.margin >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}><div className="text-xs text-slate-500">Marge nette</div><div className={`font-bold ${e.margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(e.margin)} · {e.marginPct.toFixed(0)} %</div></div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold">Notes internes</h3>
            <textarea className="input mt-2" rows={3} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Invisible pour le client" />
            <button className="btn-outline btn-sm mt-2" onClick={() => updateOrder(o.id, { internalNotes: note })}>Enregistrer</button>
          </div>

          <div className="card p-5">
            <h3 className="font-bold">Notifications envoyées</h3>
            <div className="mt-3 space-y-2">
              {notifs.map((n) => <div key={n.id} className="rounded-lg bg-slate-50 p-2.5 text-sm"><div className="flex justify-between gap-2"><b>{n.title}</b><span className="text-xs text-slate-400">{fmtDateTime(n.at)}</span></div><div className="text-slate-600">{n.body}</div><div className="mt-1 text-[11px] text-slate-400">{n.channels.join(' · ')} · {n.deliveryStatus === 'simule' ? 'envoi simulé (passerelle à raccorder)' : n.deliveryStatus}</div></div>)}
              {!notifs.length && <p className="text-sm text-slate-500">Aucune.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-bold">Actions</h3>
            <div className="mt-3 space-y-2">
              {o.status === 'attente_paiement' && <button className="btn-primary w-full" onClick={() => simulatePayment(o.id, `${me.name} (confirmation manuelle)`)}>Confirmer le paiement reçu</button>}
              {o.status === 'paiement_confirme' && <Link to="/admin/achats" className="btn-primary w-full">Lancer l’achat fournisseur</Link>}
              {o.status === 'achat_fournisseur' && <Link to="/admin/expeditions" className="btn-primary w-full">Ajouter à une expédition</Link>}
              {(o.status === 'dedouanement' || o.status === 'en_livraison') && <Link to="/admin/livraisons" className="btn-primary w-full">Gérer la livraison</Link>}
              {customer && <a className="btn-outline w-full text-emerald-700" target="_blank" rel="noreferrer" href={waLink(o.phone, lastNotif ? lastNotif.body : `Bonjour ${customer.name.split(' ')[0]}, au sujet de votre commande ${o.number} :`)}><MessageCircle size={16} />Écrire sur WhatsApp</a>}
              {['attente_paiement', 'paiement_confirme'].includes(o.status) && <button className="btn-ghost w-full text-rose-600" onClick={() => setStatus(o.id, 'annulee', me.name, 'Annulée par l’équipe')}>Annuler la commande</button>}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="mb-4 font-bold">Parcours</h3>
            <OrderTimeline order={o} staff />
          </div>
          <div className="card space-y-2 p-5 text-sm">
            <h3 className="font-bold">Client & livraison</h3>
            <div><span className="text-slate-500">Client : </span><b>{customer?.name}</b> · {o.phone}</div>
            <div><span className="text-slate-500">Livraison : </span>{o.delivery === 'relais' ? relay?.name : `${o.address}, ${o.commune}`}</div>
            {courier && <div><span className="text-slate-500">Livreur : </span>{courier.name}</div>}
            <div><span className="text-slate-500">Paiement : </span>{op?.name} {o.paymentRef && `· ${o.paymentRef}`}</div>
            {batch && <div><span className="text-slate-500">Lot d’achat : </span>{batch.number} · réf. {batch.supplierOrderRef}</div>}
            {shipment && <div><span className="text-slate-500">Expédition : </span>{shipment.number} · suivi {shipment.trackingNumber}</div>}
          </div>
        </div>
      </div>
      <Modal open={costs} onClose={() => setCosts(false)} title="Coûts réels de la commande">
        <div className="grid grid-cols-2 gap-3">
          {(['product', 'transport', 'customs', 'delivery'] as const).map((k) => <Field key={k} label={{ product: 'Produit', transport: 'Transport', customs: 'Douane', delivery: 'Livraison' }[k]}><input type="number" className="input" value={rc[k]} onChange={(ev) => setRc({ ...rc, [k]: Number(ev.target.value) })} /></Field>)}
        </div>
        <button className="btn-primary mt-4 w-full" onClick={() => { updateOrder(o.id, { realCosts: rc }); setCosts(false) }}>Enregistrer</button>
      </Modal>
    </div>
  )
}

export function LinkRequests() {
  const me = useCurrentUser()!
  const links = useStore((s) => s.linkRequests)
  const users = useStore((s) => s.users)
  const suppliers = useStore((s) => s.suppliers)
  const settings = useStore((s) => s.settings)
  const quote = useStore((s) => s.quoteLink)
  const money = useMoney()
  const [sel, setSel] = useState<string | null>(null)
  const [f, setF] = useState({ usd: '', w: '0.5', note: '' })
  const l = links.find((x) => x.id === sel)
  const usd = Number(f.usd), w = Number(f.w)
  const price = usd > 0 ? allInclusiveUnitPrice(usd, w, settings) : 0
  const parts = usd > 0 ? unitCostParts(usd, w, settings) : null
  return (
    <div>
      <PageTitle title="Demandes par lien" sub="Le client colle un lien, l’équipe vérifie l’article et envoie un prix unique tout compris." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-100 bg-slate-50"><tr><th className="table-head">Demande</th><th className="table-head">Client</th><th className="table-head">Article</th><th className="table-head">Fournisseur</th><th className="table-head">Prix client</th><th className="table-head">Statut</th><th className="table-head" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {links.map((x) => (
              <tr key={x.id}>
                <td className="table-cell"><b>{x.number}</b><div className="text-xs text-slate-400">{fmtDateTime(x.createdAt)}</div></td>
                <td className="table-cell">{users.find((u) => u.id === x.customerId)?.name}</td>
                <td className="table-cell max-w-xs"><div className="truncate font-medium">{x.title}</div><div className="text-xs text-slate-500">{[x.size, x.color, `× ${x.qty}`].filter(Boolean).join(' · ')}</div>{x.clientNote && <div className="mt-0.5 text-xs italic text-slate-500">« {x.clientNote} »</div>}<a href={x.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700">Voir le lien<ExternalLink size={10} /></a></td>
                <td className="table-cell">{suppliers.find((s) => s.id === x.supplierId)?.name}</td>
                <td className="table-cell font-semibold">{x.quotedUnitPrice ? money(x.quotedUnitPrice * x.qty) : '—'}</td>
                <td className="table-cell"><Pill tone={x.status === 'nouvelle' ? 'amber' : x.status === 'acceptee' ? 'green' : x.status === 'chiffree' ? 'violet' : 'slate'}>{LINK_STATUS[x.status]}</Pill></td>
                <td className="table-cell text-right">{(x.status === 'nouvelle' || x.status === 'chiffree') && <button className="btn-primary btn-sm" onClick={() => { setSel(x.id); setF({ usd: x.supplierPriceUsd ? String(x.supplierPriceUsd) : '', w: String(x.weightKg ?? 0.5), note: x.adminNote ?? '' }) }}>{x.status === 'nouvelle' ? 'Chiffrer' : 'Modifier'}</button>}{x.orderId && <Link to={`/admin/commandes/${x.orderId}`} className="text-xs font-semibold text-brand-700">Commande →</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!l} onClose={() => setSel(null)} title={`Chiffrer ${l?.number ?? ''}`}>
        {l && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><b>{l.title}</b> · {[l.size, l.color, `× ${l.qty}`].filter(Boolean).join(' · ')}<a href={l.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-brand-700">{l.url}</a></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix fournisseur ($ USD)"><input className="input" type="number" step="0.01" value={f.usd} onChange={(e) => setF({ ...f, usd: e.target.value })} /></Field>
              <Field label="Poids estimé (kg)"><input className="input" type="number" step="0.05" value={f.w} onChange={(e) => setF({ ...f, w: e.target.value })} /></Field>
            </div>
            <Field label="Message au client (facultatif)"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Ex. Disponible en M uniquement" /></Field>
            {parts && (
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <div className="flex justify-between"><span>Produit</span><span>{money(parts.product)}</span></div>
                <div className="flex justify-between"><span>Service ({settings.serviceFeePct} %)</span><span>{money(parts.service)}</span></div>
                <div className="flex justify-between"><span>Transport</span><span>{money(parts.transport)}</span></div>
                <div className="flex justify-between"><span>Douane ({settings.customsPct} %)</span><span>{money(parts.customs)}</span></div>
                <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-bold"><span>Prix unique client × {l.qty}</span><span className="text-brand-800">{money(price * l.qty)}</span></div>
              </div>
            )}
            <button disabled={!price} className="btn-primary w-full" onClick={() => { quote(l.id, usd, w, f.note, me.name); setSel(null) }}>Envoyer le devis au client</button>
            <p className="text-center text-xs text-slate-400">Le client reçoit une notification et peut accepter en un clic.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

