import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, ShoppingBag, Plane, CheckCircle2, Truck, Store, Bot, Info, Shield } from 'lucide-react'
import { useStore, useCurrentUser } from '../../lib/store'
import { PageTitle, Pill, Modal, Field, Empty, StatusBadge } from '../../components/ui'
import { useMoney, fmtDate, fmtDateTime } from '../../lib/format'
import type { Order } from '../../lib/types'

function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={checked} onChange={onChange} />
}

export function Purchasing() {
  const me = useCurrentUser()!
  const orders = useStore((s) => s.orders.filter((o) => o.status === 'paiement_confirme'))
  const suppliers = useStore((s) => s.suppliers)
  const batches = useStore((s) => s.batches)
  const users = useStore((s) => s.users)
  const createBatch = useStore((s) => s.createBatch)
  const settingsFx = useStore((s) => s.settings.fxRate)
  const money = useMoney()
  const [sel, setSel] = useState<string[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [ref, setRef] = useState('')
  const [amount, setAmount] = useState('')
  const bySup = new Map<string, Order[]>()
  orders.forEach((o) => { const k = o.items[0].supplierId; bySup.set(k, [...(bySup.get(k) ?? []), o]) })
  const usdOf = (os: Order[]) => os.reduce((s, o) => s + o.items.reduce((a, i) => a + i.supplierPriceUsd * i.qty, 0), 0)
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])

  return (
    <div>
      <PageTitle title="Achats fournisseur" sub="Étape pilotée par l’équipe : achat groupé et planifié, invisible pour le client." />
      <div className="mb-5 flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div><b>Option A (SHEIN)</b> : pas d’API de commande, l’équipe passe la commande sur le site puis enregistre la référence ici. <b>Option B (dropship API)</b> : le bouton « Commande automatique » sera raccordé à l’API du fournisseur (CJ Dropshipping…).</div>
      </div>
      {!orders.length && <Empty icon={<ShoppingBag size={28} />} title="Aucune commande à acheter" text="Toutes les commandes payées ont été achetées." />}
      <div className="space-y-5">
        {[...bySup.entries()].map(([supId, os]) => {
          const sup = suppliers.find((s) => s.id === supId)!
          const selected = os.filter((o) => sel.includes(o.id))
          return (
            <div key={supId} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold">{sup.name}</h3>
                  <Pill tone={sup.apiAvailable ? 'green' : 'amber'}>{sup.apiAvailable ? 'API disponible' : 'Achat manuel'}</Pill>
                  <span className="text-sm text-slate-500">{os.length} commande(s) · ≈ {usdOf(os).toFixed(2)} $</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => setSel([...new Set([...sel, ...os.map((o) => o.id)])])}>Tout sélectionner</button>
                  {sup.apiAvailable && <button className="btn-outline btn-sm" disabled title="À raccorder à l’API du fournisseur"><Bot size={14} />Commande automatique (bientôt)</button>}
                  <button className="btn-primary btn-sm" disabled={!selected.length} onClick={() => { setModal(supId); setAmount(usdOf(selected).toFixed(2)); setRef('') }}>Créer un lot d’achat ({selected.length})</button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {os.map((o) => (
                  <div key={o.id} className="flex gap-3 p-4">
                    <Check checked={sel.includes(o.id)} onChange={() => toggle(o.id)} />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm"><Link to={`/admin/commandes/${o.id}`} className="font-semibold text-brand-700">{o.number}</Link><span className="text-slate-500">{users.find((u) => u.id === o.customerId)?.name}</span><span className="text-xs text-slate-400">payée le {fmtDate(o.paidAt)} · promis {fmtDate(o.promisedDate)}</span></div>
                      <ul className="mt-1 space-y-0.5 text-sm">
                        {o.items.map((i, k) => <li key={k} className="flex flex-wrap items-center gap-2"><span>{i.qty} × {i.name}</span><span className="text-xs text-slate-500">{[i.size, i.color].filter(Boolean).join(' / ')} · {i.supplierPriceUsd.toFixed(2)} $</span>{i.supplierUrl && <a href={i.supplierUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-brand-700">lien<ExternalLink size={10} /></a>}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold">Lots d’achat</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-slate-100 bg-slate-50"><tr><th className="table-head">Lot</th><th className="table-head">Fournisseur</th><th className="table-head">Réf. fournisseur</th><th className="table-head">Commandes</th><th className="table-head">Montant</th><th className="table-head">Statut</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {[...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30).map((b) => (
              <tr key={b.id}><td className="table-cell font-semibold">{b.number}<div className="text-xs font-normal text-slate-400">{fmtDate(b.createdAt)} · {b.buyer}</div></td><td className="table-cell">{suppliers.find((s) => s.id === b.supplierId)?.name}</td><td className="table-cell font-mono text-xs">{b.supplierOrderRef}</td><td className="table-cell">{b.orderIds.length}</td><td className="table-cell">{b.amountUsd.toFixed(2)} $</td><td className="table-cell"><Pill tone={b.status === 'recue_entrepot' ? 'green' : 'amber'}>{b.status === 'recue_entrepot' ? 'Expédié' : 'Commandé'}</Pill></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title="Créer un lot d’achat">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{sel.filter((id) => orders.find((o) => o.id === id && o.items[0].supplierId === modal)).length} commande(s) chez {suppliers.find((s) => s.id === modal)?.name}. Passe la commande sur le site du fournisseur, puis enregistre la référence.</p>
          <Field label="Référence de commande fournisseur"><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="GSH12345678" /></Field>
          <Field label="Montant réellement payé ($ USD)" hint={`≈ ${money(Number(amount) * settingsFx)} — sert au calcul de la marge réelle par commande.`}><input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <button className="btn-primary w-full" disabled={!ref || !Number(amount)} onClick={() => {
            const ids = sel.filter((id) => orders.find((o) => o.id === id && o.items[0].supplierId === modal))
            createBatch({ supplierId: modal!, orderIds: ids, supplierOrderRef: ref, amountUsd: Number(amount), buyer: me.name })
            setSel(sel.filter((x) => !ids.includes(x))); setModal(null)
          }}>Valider l’achat — clients notifiés</button>
        </div>
      </Modal>
    </div>
  )
}

export function Shipments() {
  const me = useCurrentUser()!
  const ready = useStore((s) => s.orders.filter((o) => o.status === 'achat_fournisseur'))
  const allOrders = useStore((s) => s.orders)
  const shipments = useStore((s) => s.shipments)
  const forwarders = useStore((s) => s.forwarders)
  const settings = useStore((s) => s.settings)
  const { createShipment, shipmentArrived } = useStore((s) => ({ createShipment: s.createShipment, shipmentArrived: s.shipmentArrived }))
  const money = useMoney()
  const [sel, setSel] = useState<string[]>([])
  const [modal, setModal] = useState(false)
  const activeFwd = forwarders.filter((f) => f.active)
  const [f, setF] = useState({ forwarderId: activeFwd[0]?.id ?? '', tracking: '', cost: '', insured: true, eta: '' })
  const [arrive, setArrive] = useState<string | null>(null)
  const [customs, setCustoms] = useState('')
  const weight = ready.filter((o) => sel.includes(o.id)).reduce((s, o) => s + o.items.reduce((a, i) => a + Math.max(i.weightKg, settings.minWeightKg) * i.qty, 0), 0)
  const fwd = forwarders.find((x) => x.id === f.forwarderId)
  const shArr = shipments.find((x) => x.id === arrive)

  return (
    <div>
      <PageTitle title="Transit & douane" sub="Groupage des colis, expédition avec le transitaire partenaire, arrivée et dédouanement." />
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h3 className="font-bold">Prêtes à expédier ({ready.length})</h3>
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setSel(ready.map((o) => o.id))}>Tout sélectionner</button>
            <button className="btn-primary btn-sm" disabled={!sel.length} onClick={() => { const est = Math.round(weight * (fwd?.ratePerKgUsd ?? settings.transportPerKgUsd) * settings.fxRate); const eta = new Date(); eta.setDate(eta.getDate() + (fwd?.avgDays ?? 14)); setF({ ...f, cost: String(est), eta: eta.toISOString().slice(0, 10), insured: weight > 50 }); setModal(true) }}><Plane size={14} />Créer une expédition ({sel.length})</button>
          </div>
        </div>
        {!ready.length && <p className="p-6 text-center text-sm text-slate-500">Aucune commande en attente d’expédition.</p>}
        <div className="divide-y divide-slate-100">
          {ready.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-slate-50">
              <Check checked={sel.includes(o.id)} onChange={() => setSel(sel.includes(o.id) ? sel.filter((x) => x !== o.id) : [...sel, o.id])} />
              <Link to={`/admin/commandes/${o.id}`} className="font-semibold text-brand-700">{o.number}</Link>
              <span className="text-slate-500">{o.items.reduce((a, i) => a + i.qty, 0)} article(s) · {o.items.reduce((a, i) => a + Math.max(i.weightKg, settings.minWeightKg) * i.qty, 0).toFixed(2)} kg</span>
              <span className="ml-auto text-xs text-slate-400">acheté le {fmtDate(o.history.find((h) => h.status === 'achat_fournisseur')?.at)}</span>
            </label>
          ))}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Expéditions</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {[...shipments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-center justify-between"><div><b>{s.number}</b> <span className="font-mono text-xs text-slate-500">{s.trackingNumber}</span></div><Pill tone={s.status === 'dedouanee' ? 'green' : 'violet'}>{s.status === 'dedouanee' ? 'Arrivée & dédouanée' : 'En transit'}</Pill></div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
              <span>{forwarders.find((x) => x.id === s.forwarderId)?.name}</span><span>{s.orderIds.length} commandes · {s.weightKg} kg</span>
              <span>Départ {fmtDate(s.departedAt)}</span><span>{s.arrivedAt ? `Arrivée ${fmtDate(s.arrivedAt)}` : `ETA ${fmtDate(s.eta)}`}</span>
              <span>Transport {money(s.transportCost)}</span><span>Douane {s.customsCost ? money(s.customsCost) : '—'}</span>
            </div>
            {s.insured && <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700"><Shield size={12} />Assurance colis groupés</div>}
            {s.status === 'en_transit' && <button className="btn-primary btn-sm mt-3 w-full" onClick={() => { setArrive(s.id); setCustoms(String(allOrders.filter((o) => s.orderIds.includes(o.id)).reduce((a, o) => a + o.breakdown.customs, 0))) }}><CheckCircle2 size={14} />Marquer arrivée & dédouanement</button>}
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle expédition">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{sel.length} commande(s) · poids total ≈ <b>{weight.toFixed(2)} kg</b></p>
          <Field label="Transitaire"><select className="input" value={f.forwarderId} onChange={(e) => setF({ ...f, forwarderId: e.target.value })}>{activeFwd.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.route}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° de suivi"><input className="input" value={f.tracking} onChange={(e) => setF({ ...f, tracking: e.target.value })} placeholder="CFE-123456" /></Field>
            <Field label="Arrivée estimée"><input type="date" className="input" value={f.eta} onChange={(e) => setF({ ...f, eta: e.target.value })} /></Field>
          </div>
          <Field label={`Coût transport réel (${settings.currencySymbol})`} hint="Réparti sur les commandes au prorata du poids."><input type="number" className="input" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-700" checked={f.insured} onChange={(e) => setF({ ...f, insured: e.target.checked })} />Assurance sur colis groupés</label>
          <button className="btn-primary w-full" disabled={!f.tracking || !f.forwarderId} onClick={() => { createShipment({ orderIds: sel, forwarderId: f.forwarderId, trackingNumber: f.tracking, transportCost: Number(f.cost), insured: f.insured, eta: new Date(f.eta).toISOString(), by: me.name }); setSel([]); setModal(false) }}>Confirmer le départ — clients notifiés</button>
        </div>
      </Modal>
      <Modal open={!!shArr} onClose={() => setArrive(null)} title={`Arrivée ${shArr?.number ?? ''}`}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Le colis groupé est arrivé et dédouané. Les {shArr?.orderIds.length} clients seront notifiés.</p>
          <Field label={`Frais de douane réels (${settings.currencySymbol})`} hint="Répartis au prorata de la valeur des articles."><input type="number" className="input" value={customs} onChange={(e) => setCustoms(e.target.value)} /></Field>
          <button className="btn-primary w-full" onClick={() => { shipmentArrived(shArr!.id, Number(customs), me.name); setArrive(null) }}>Valider</button>
        </div>
      </Modal>
    </div>
  )
}

export function Deliveries() {
  const me = useCurrentUser()!
  const toDispatch = useStore((s) => s.orders.filter((o) => o.status === 'dedouanement'))
  const inDelivery = useStore((s) => s.orders.filter((o) => o.status === 'en_livraison'))
  const couriers = useStore((s) => s.couriers.filter((c) => c.active))
  const relayPoints = useStore((s) => s.relayPoints)
  const users = useStore((s) => s.users)
  const settings = useStore((s) => s.settings)
  const { dispatchOrder, markDelivered } = useStore((s) => ({ dispatchOrder: s.dispatchOrder, markDelivered: s.markDelivered }))
  const money = useMoney()
  const [courier, setCourier] = useState<Record<string, string>>({})
  const [deliver, setDeliver] = useState<Order | null>(null)
  const [cost, setCost] = useState('')
  const [recv, setRecv] = useState('')
  const where = (o: Order) => o.delivery === 'relais' ? <span className="inline-flex items-center gap-1"><Store size={13} />{relayPoints.find((r) => r.id === o.relayPointId)?.name}</span> : <span className="inline-flex items-center gap-1"><Truck size={13} />{o.commune} — {o.address}</span>

  return (
    <div>
      <PageTitle title="Livraison locale" sub="Remise au livreur ou dépôt en point relais, puis confirmation de livraison." />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <h3 className="border-b border-slate-100 p-4 font-bold">À expédier localement ({toDispatch.length})</h3>
          {!toDispatch.length && <p className="p-6 text-center text-sm text-slate-500">Rien à livrer pour l’instant.</p>}
          <div className="divide-y divide-slate-100">
            {toDispatch.map((o) => (
              <div key={o.id} className="space-y-2 p-4 text-sm">
                <div className="flex justify-between"><Link to={`/admin/commandes/${o.id}`} className="font-semibold text-brand-700">{o.number}</Link><span className="text-slate-500">{users.find((u) => u.id === o.customerId)?.name} · {o.phone}</span></div>
                <div className="text-xs text-slate-600">{where(o)}</div>
                <div className="flex gap-2">
                  {o.delivery === 'domicile' || o.delivery === 'express' ? (
                    <>
                      <select className="input py-1.5 text-xs" value={courier[o.id] ?? couriers[0]?.id} onChange={(e) => setCourier({ ...courier, [o.id]: e.target.value })}>{couriers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.vehicle})</option>)}</select>
                      <button className="btn-primary btn-sm whitespace-nowrap" onClick={() => dispatchOrder(o.id, courier[o.id] ?? couriers[0]?.id, me.name)}>Confier au livreur</button>
                    </>
                  ) : <button className="btn-primary btn-sm" onClick={() => dispatchOrder(o.id, undefined, me.name)}>Déposé au point relais</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="border-b border-slate-100 p-4 font-bold">En cours de livraison ({inDelivery.length})</h3>
          {!inDelivery.length && <p className="p-6 text-center text-sm text-slate-500">Aucune livraison en cours.</p>}
          <div className="divide-y divide-slate-100">
            {inDelivery.map((o) => (
              <div key={o.id} className="flex items-center gap-3 p-4 text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><Link to={`/admin/commandes/${o.id}`} className="font-semibold text-brand-700">{o.number}</Link><StatusBadge status={o.status} /></div>
                  <div className="text-xs text-slate-600">{where(o)}{o.courierId && ` · ${couriers.find((c) => c.id === o.courierId)?.name ?? ''}`}</div>
                  <div className="text-xs text-slate-400">depuis {fmtDateTime(o.history[o.history.length - 1].at)}</div>
                </div>
                <button className="btn-outline btn-sm" onClick={() => { setDeliver(o); setCost(String(o.delivery === 'relais' ? Math.round(settings.relayDeliveryFee * 0.6) : Math.round(settings.homeDeliveryFee * 0.7))); setRecv(users.find((u) => u.id === o.customerId)?.name ?? '') }}><CheckCircle2 size={14} />Livrée</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Modal open={!!deliver} onClose={() => setDeliver(null)} title={`Confirmer la livraison ${deliver?.number ?? ''}`}>
        <div className="space-y-3">
          <Field label="Remis à (nom)"><input className="input" value={recv} onChange={(e) => setRecv(e.target.value)} /></Field>
          <Field label={`Coût réel de livraison (${settings.currencySymbol})`} hint={`Facturé au client : ${deliver ? money(deliver.breakdown.delivery) : ''}`}><input type="number" className="input" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          <button className="btn-primary w-full" onClick={() => { markDelivered(deliver!.id, Number(cost), me.name, `Remis à ${recv}`); setDeliver(null) }}>Confirmer — le client est invité à donner son avis</button>
        </div>
      </Modal>
    </div>
  )
}
