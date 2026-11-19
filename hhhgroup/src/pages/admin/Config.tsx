import { useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { PageTitle, Pill, Modal, Field } from '../../components/ui'
import ProductVisual, { GLYPHS } from '../../components/ProductVisual'
import { useMoney, uid } from '../../lib/format'
import { CATEGORIES } from '../../lib/constants'
import { allInclusiveUnitPrice, unitCostParts } from '../../lib/pricing'
import type { Product, Category } from '../../lib/types'

export function CatalogueAdmin() {
  const products = useStore((s) => s.products)
  const suppliers = useStore((s) => s.suppliers)
  const settings = useStore((s) => s.settings)
  const { upsert, remove } = useStore((s) => ({ upsert: s.upsert, remove: s.remove }))
  const money = useMoney()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Product | null>(null)
  const list = products.filter((p) => !q || `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()))
  const blank = (): Product => ({ id: uid('prd-'), name: '', category: 'Mode femme', supplierId: suppliers[0].id, supplierUrl: '', supplierPriceUsd: 10, weightKg: 0.4, image: '', glyph: 'dress', hue: 280, sizes: ['S', 'M', 'L'], colors: ['Noir'], description: '', tags: [], active: true, featured: false, createdAt: new Date().toISOString() })
  const parts = edit ? unitCostParts(edit.supplierPriceUsd, edit.weightKg, settings) : null
  const price = edit ? allInclusiveUnitPrice(edit.supplierPriceUsd, edit.weightKg, settings) : 0
  return (
    <div>
      <PageTitle title="Catalogue" sub={`${products.filter((p) => p.active).length} articles en ligne · prix client calculé automatiquement depuis le prix fournisseur`} actions={<button className="btn-primary btn-sm" onClick={() => setEdit(blank())}><Plus size={14} />Nouvel article</button>} />
      <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-slate-100 bg-slate-50"><tr><th className="table-head">Article</th><th className="table-head">Fournisseur</th><th className="table-head">Prix fournisseur</th><th className="table-head">Poids</th><th className="table-head">Prix client</th><th className="table-head">Statut</th><th className="table-head" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="table-cell"><div className="flex items-center gap-3"><div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg"><ProductVisual glyph={p.glyph} hue={p.hue} image={p.image} /></div><div><div className="font-semibold">{p.name}</div><div className="text-xs text-slate-400">{p.category}</div></div></div></td>
                <td className="table-cell">{suppliers.find((s) => s.id === p.supplierId)?.name}</td>
                <td className="table-cell">{p.supplierPriceUsd.toFixed(2)} $</td>
                <td className="table-cell">{p.weightKg} kg</td>
                <td className="table-cell font-semibold">{money(allInclusiveUnitPrice(p.supplierPriceUsd, p.weightKg, settings))}</td>
                <td className="table-cell"><div className="flex gap-1">{p.active ? <Pill tone="green">En ligne</Pill> : <Pill>Masqué</Pill>}{p.featured && <Pill tone="violet">Tendance</Pill>}</div></td>
                <td className="table-cell text-right"><button className="btn-ghost btn-sm" onClick={() => setEdit(p)}><Pencil size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name || 'Nouvel article'} wide>
        {edit && (
          <div className="grid gap-5 md:grid-cols-[200px_1fr]">
            <div>
              <div className="aspect-[4/5] overflow-hidden rounded-xl border border-slate-200"><ProductVisual glyph={edit.glyph} hue={edit.hue} image={edit.image} /></div>
              {!edit.image && (
                <div className="mt-3 space-y-2">
                  <Field label="Illustration"><select className="input" value={edit.glyph} onChange={(e) => setEdit({ ...edit, glyph: e.target.value })}>{GLYPHS.map((g) => <option key={g}>{g}</option>)}</select></Field>
                  <Field label="Teinte"><input type="range" min={0} max={359} className="w-full" value={edit.hue} onChange={(e) => setEdit({ ...edit, hue: Number(e.target.value) })} /></Field>
                </div>
              )}
              {parts && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between"><span>Produit</span><span>{money(parts.product)}</span></div>
                  <div className="flex justify-between"><span>Service</span><span>{money(parts.service)}</span></div>
                  <div className="flex justify-between"><span>Transport</span><span>{money(parts.transport)}</span></div>
                  <div className="flex justify-between"><span>Douane</span><span>{money(parts.customs)}</span></div>
                  <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-bold"><span>Client</span><span className="text-brand-800">{money(price)}</span></div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Field label="Nom"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Catégorie"><select className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as Category })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Fournisseur"><select className="input" value={edit.supplierId} onChange={(e) => setEdit({ ...edit, supplierId: e.target.value })}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                <Field label="Prix fournisseur ($)"><input type="number" step="0.01" className="input" value={edit.supplierPriceUsd} onChange={(e) => setEdit({ ...edit, supplierPriceUsd: Number(e.target.value) })} /></Field>
                <Field label="Poids (kg)"><input type="number" step="0.05" className="input" value={edit.weightKg} onChange={(e) => setEdit({ ...edit, weightKg: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Lien fournisseur"><input className="input" value={edit.supplierUrl} onChange={(e) => setEdit({ ...edit, supplierUrl: e.target.value })} /></Field>
              <Field label="Image (URL)" hint="Laisser vide pour utiliser l’illustration."><input className="input" value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} placeholder="https://…" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tailles (séparées par des virgules)"><input className="input" value={edit.sizes.join(', ')} onChange={(e) => setEdit({ ...edit, sizes: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
                <Field label="Couleurs"><input className="input" value={edit.colors.join(', ')} onChange={(e) => setEdit({ ...edit, colors: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
              </div>
              <Field label="Description"><textarea className="input" rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-700" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />En ligne</label>
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-700" checked={edit.featured} onChange={(e) => setEdit({ ...edit, featured: e.target.checked })} />Tendance (accueil)</label>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary flex-1" disabled={!edit.name || !edit.sizes.length || !edit.colors.length} onClick={() => { upsert('products', edit); setEdit(null) }}>Enregistrer</button>
                {products.some((p) => p.id === edit.id) && <button className="btn-outline text-rose-600" onClick={() => { remove('products', edit.id); setEdit(null) }}><Trash2 size={16} /></button>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

type Col = 'suppliers' | 'forwarders' | 'couriers' | 'relayPoints' | 'operators'
type FieldDef = { key: string; label: string; type?: 'text' | 'number' | 'bool' | 'select' | 'list'; options?: [string, string][] }

const DEFS: Record<Col, { title: string; desc: string; fields: FieldDef[]; blank: () => Record<string, unknown> }> = {
  suppliers: { title: 'Fournisseurs', desc: 'Option A : SHEIN (achat piloté). Option B : sources dropship avec API, à tester en parallèle.', fields: [{ key: 'name', label: 'Nom' }, { key: 'kind', label: 'Type', type: 'select', options: [['catalogue', 'Catalogue (achat manuel)'], ['dropship_api', 'Dropship API'], ['grossiste', 'Grossiste']] }, { key: 'website', label: 'Site' }, { key: 'domains', label: 'Domaines reconnus (liens)', type: 'list' }, { key: 'apiAvailable', label: 'API de commande', type: 'bool' }, { key: 'notes', label: 'Notes' }, { key: 'active', label: 'Actif', type: 'bool' }], blank: () => ({ id: uid('sup-'), name: '', kind: 'dropship_api', website: '', domains: [], apiAvailable: false, notes: '', active: true }) },
  forwarders: { title: 'Transitaires', desc: 'Un partenaire unique et fiable au lancement : c’est le goulot d’étranglement le plus probable.', fields: [{ key: 'name', label: 'Nom' }, { key: 'contact', label: 'Contact' }, { key: 'phone', label: 'Téléphone' }, { key: 'route', label: 'Route' }, { key: 'ratePerKgUsd', label: 'Tarif ($/kg)', type: 'number' }, { key: 'avgDays', label: 'Délai moyen (jours)', type: 'number' }, { key: 'notes', label: 'Notes' }, { key: 'active', label: 'Actif', type: 'bool' }], blank: () => ({ id: uid('fwd-'), name: '', contact: '', phone: '', route: '', ratePerKgUsd: 10, avgDays: 14, notes: '', active: true }) },
  couriers: { title: 'Livreurs', desc: 'Partenaires de livraison locale à domicile.', fields: [{ key: 'name', label: 'Nom' }, { key: 'phone', label: 'Téléphone' }, { key: 'zone', label: 'Zone' }, { key: 'vehicle', label: 'Véhicule' }, { key: 'active', label: 'Actif', type: 'bool' }], blank: () => ({ id: uid('crr-'), name: '', phone: '', zone: '', vehicle: 'Moto', active: true }) },
  relayPoints: { title: 'Points relais', desc: 'Coûts logistiques réduits : encouragés par un tarif de livraison plus bas.', fields: [{ key: 'name', label: 'Nom' }, { key: 'commune', label: 'Commune' }, { key: 'address', label: 'Adresse' }, { key: 'hours', label: 'Horaires' }, { key: 'phone', label: 'Téléphone' }, { key: 'active', label: 'Actif', type: 'bool' }], blank: () => ({ id: uid('rp-'), name: '', commune: '', address: '', hours: 'Lun-Sam 9h-18h', phone: '', active: true }) },
  operators: { title: 'Mobile Money', desc: 'Opérateurs proposés au paiement. Le raccordement (agrégateur / API marchand) se fera plus tard.', fields: [{ key: 'name', label: 'Nom' }, { key: 'short', label: 'Nom court' }, { key: 'color', label: 'Couleur' }, { key: 'merchantCode', label: 'Code marchand' }, { key: 'active', label: 'Proposé au paiement', type: 'bool' }], blank: () => ({ id: uid('op-'), name: '', short: '', color: '#7c3aed', merchantCode: 'À configurer', active: true }) },
}

export function Partners() {
  const [tab, setTab] = useState<Col>('suppliers')
  const data = useStore((s) => s[tab]) as unknown as Record<string, unknown>[]
  const { upsert, remove } = useStore((s) => ({ upsert: s.upsert, remove: s.remove }))
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null)
  const def = DEFS[tab]
  const show = (v: unknown, f: FieldDef) => f.type === 'bool' ? (v ? <Pill tone="green">Oui</Pill> : <Pill>Non</Pill>) : f.type === 'list' ? (v as string[]).join(', ') : f.type === 'select' ? f.options!.find((o) => o[0] === v)?.[1] : String(v ?? '')
  const visible = def.fields.filter((f) => f.key !== 'notes')
  return (
    <div>
      <PageTitle title="Partenaires" sub="Les partenaires dont HHHGroup dépend pour tenir sa promesse." actions={<button className="btn-primary btn-sm" onClick={() => setEdit(def.blank())}><Plus size={14} />Ajouter</button>} />
      <div className="mb-4 flex gap-2 overflow-x-auto">{(Object.keys(DEFS) as Col[]).map((k) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${tab === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{DEFS[k].title}</button>)}</div>
      <p className="mb-3 text-sm text-slate-500">{def.desc}</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-slate-100 bg-slate-50"><tr>{visible.map((f) => <th key={f.key} className="table-head">{f.label}</th>)}<th className="table-head" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr key={row.id as string}>{visible.map((f) => <td key={f.key} className="table-cell">{show(row[f.key], f)}</td>)}<td className="table-cell text-right"><button className="btn-ghost btn-sm" onClick={() => setEdit({ ...row })}><Pencil size={14} /></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.some((r) => r.notes) && <div className="mt-4 space-y-2">{data.filter((r) => r.notes).map((r) => <div key={r.id as string} className="rounded-xl bg-white p-3 text-sm"><b>{r.name as string}</b> — <span className="text-slate-600">{r.notes as string}</span></div>)}</div>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={(edit?.name as string) || `Ajouter — ${def.title}`}>
        {edit && (
          <div className="space-y-3">
            {def.fields.map((f) => f.type === 'bool' ? (
              <label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-700" checked={!!edit[f.key]} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.checked })} />{f.label}</label>
            ) : (
              <Field key={f.key} label={f.label}>
                {f.type === 'select' ? <select className="input" value={edit[f.key] as string} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })}>{f.options!.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
                  : <input className="input" type={f.type === 'number' ? 'number' : 'text'} value={f.type === 'list' ? (edit[f.key] as string[]).join(', ') : (edit[f.key] as string | number)} onChange={(e) => setEdit({ ...edit, [f.key]: f.type === 'number' ? Number(e.target.value) : f.type === 'list' ? e.target.value.split(',').map((x) => x.trim()).filter(Boolean) : e.target.value })} />}
              </Field>
            ))}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={!edit.name} onClick={() => { upsert(tab, edit as never); setEdit(null) }}>Enregistrer</button>
              {data.some((r) => r.id === edit.id) && <button className="btn-outline text-rose-600" onClick={() => { remove(tab, edit.id as string); setEdit(null) }}><Trash2 size={16} /></button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
