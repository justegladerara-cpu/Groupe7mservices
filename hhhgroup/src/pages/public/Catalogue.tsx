import { useMemo, useState } from 'react'
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom'
import { Search, ShieldCheck, Truck, Smartphone, Minus, Plus, Check, ChevronLeft, Package } from 'lucide-react'
import { useStore } from '../../lib/store'
import ProductCard from '../../components/ProductCard'
import ProductVisual from '../../components/ProductVisual'
import { CATEGORIES } from '../../lib/constants'
import { allInclusiveUnitPrice, deliveryWindow } from '../../lib/pricing'
import { useMoney, fmtDate } from '../../lib/format'
import { Stars, Empty } from '../../components/ui'

export function Catalogue() {
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') ?? ''
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('pop')
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)
  const list = useMemo(() => {
    let l = products.filter((p) => p.active && (!cat || p.category === cat) && (!q || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q.toLowerCase())))
    const price = (p: typeof l[0]) => allInclusiveUnitPrice(p.supplierPriceUsd, p.weightKg, settings)
    if (sort === 'asc') l = [...l].sort((a, b) => price(a) - price(b))
    if (sort === 'desc') l = [...l].sort((a, b) => price(b) - price(a))
    if (sort === 'pop') l = [...l].sort((a, b) => Number(b.featured) - Number(a.featured))
    return l
  }, [products, cat, q, sort, settings])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Catalogue</h1>
      <p className="mt-1 text-sm text-slate-500">Tous les prix sont <b className="text-emerald-700">tout compris</b> : produit, service, transport international et douane.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Rechercher une robe, des baskets, un parfum…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:w-56" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="pop">Tendances d’abord</option>
          <option value="asc">Prix croissant</option>
          <option value="desc">Prix décroissant</option>
        </select>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setParams({})} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${!cat ? 'bg-brand-700 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Tout</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setParams({ cat: c })} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${cat === c ? 'bg-brand-700 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{c}</button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {list.length === 0 && <Empty icon={<Package size={32} />} title="Aucun article trouvé" text="Tu ne trouves pas ? Colle directement le lien de l’article, on s’en occupe." action={<Link to="/lien" className="btn-primary">Commander par lien</Link>} />}
    </div>
  )
}

export function ProductDetail() {
  const { id } = useParams()
  const p = useStore((s) => s.products.find((x) => x.id === id))
  const settings = useStore((s) => s.settings)
  const reviews = useStore((s) => s.reviews.filter((r) => r.productId === id && r.status === 'publie'))
  const users = useStore((s) => s.users)
  const addToCart = useStore((s) => s.addToCart)
  const similar = useStore((s) => s.products.filter((x) => x.active && x.category === p?.category && x.id !== id).slice(0, 4))
  const money = useMoney()
  const nav = useNavigate()
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-16"><Empty title="Article introuvable" action={<Link to="/catalogue" className="btn-primary">Retour au catalogue</Link>} /></div>
  const price = allInclusiveUnitPrice(p.supplierPriceUsd, p.weightKg, settings)
  const needSize = p.sizes.length > 1, needColor = p.colors.length > 1
  const s = size || (needSize ? '' : p.sizes[0]), c = color || (needColor ? '' : p.colors[0])
  const valid = !!s && !!c
  const eta = new Date(); eta.setDate(eta.getDate() + settings.standardDaysMax)
  const add = (go?: boolean) => { addToCart({ productId: p.id, size: s, color: c, qty }); setAdded(true); if (go) nav('/panier') }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <button onClick={() => nav(-1)} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ChevronLeft size={16} />Retour</button>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white md:aspect-[4/5]"><ProductVisual glyph={p.glyph} hue={p.hue} image={p.image} /></div>
        <div>
          <div className="text-sm font-medium text-brand-700">{p.category}</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{p.name}</h1>
          {reviews.length > 0 && <div className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Stars value={Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length)} />{reviews.length} avis vérifiés</div>}
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <div className="text-3xl font-extrabold text-slate-900">{money(price)}</div>
            <div className="mt-1 text-sm font-medium text-emerald-800">Prix final tout compris, livré au Congo</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-900/80">
              {['Produit', 'Service HHHGroup', 'Transport international', 'Douane'].map((x) => <span key={x} className="flex items-center gap-1"><Check size={12} />{x}</span>)}
            </div>
          </div>
          <p className="mt-5 text-slate-600">{p.description}</p>
          {needSize && (
            <div className="mt-5">
              <div className="label">Taille</div>
              <div className="flex flex-wrap gap-2">{p.sizes.map((x) => <button key={x} onClick={() => setSize(x)} className={`min-w-[3rem] rounded-xl border px-3 py-2 text-sm font-medium ${size === x ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 bg-white'}`}>{x}</button>)}</div>
            </div>
          )}
          {needColor && (
            <div className="mt-4">
              <div className="label">Couleur</div>
              <div className="flex flex-wrap gap-2">{p.colors.map((x) => <button key={x} onClick={() => setColor(x)} className={`rounded-xl border px-3 py-2 text-sm font-medium ${color === x ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 bg-white'}`}>{x}</button>)}</div>
            </div>
          )}
          <div className="mt-4">
            <div className="label">Quantité</div>
            <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white">
              <button className="p-2.5" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16} /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button className="p-2.5" onClick={() => setQty(Math.min(10, qty + 1))}><Plus size={16} /></button>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button disabled={!valid} onClick={() => add(true)} className="btn-primary flex-1 py-3 text-base">Commander maintenant</button>
            <button disabled={!valid} onClick={() => add()} className="btn-outline flex-1 py-3 text-base">{added ? <><Check size={18} />Ajouté</> : 'Ajouter au panier'}</button>
          </div>
          {!valid && <p className="mt-2 text-xs text-amber-700">Choisis {!s && needSize ? 'une taille' : ''}{!s && needSize && !c && needColor ? ' et ' : ''}{!c && needColor ? 'une couleur' : ''} pour continuer.</p>}
          <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex gap-3"><Truck size={18} className="text-brand-700" /><div><b>Livraison Standard {deliveryWindow('domicile', settings)}</b><div className="text-slate-500">Reçu au plus tard le {fmtDate(eta.toISOString())} si tu commandes aujourd’hui</div></div></div>
            <div className="flex gap-3"><Smartphone size={18} className="text-brand-700" /><div><b>Paiement Mobile Money</b><div className="text-slate-500">MTN MoMo, Airtel Money</div></div></div>
            <div className="flex gap-3"><ShieldCheck size={18} className="text-brand-700" /><div><b>Achat protégé</b><div className="text-slate-500">Article non conforme ou endommagé : remboursement, avoir ou renvoi</div></div></div>
          </div>
        </div>
      </div>
      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Avis sur cet article</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reviews.map((r) => {
              const u = users.find((x) => x.id === r.customerId)
              return <div key={r.id} className="card p-4"><Stars value={r.rating} /><p className="mt-2 text-sm text-slate-700">{r.comment}</p><div className="mt-2 text-xs text-slate-400">{u?.name.split(' ')[0]} · {fmtDate(r.at)} · Achat vérifié</div></div>
            })}
          </div>
        </section>
      )}
      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Dans la même catégorie</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{similar.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
    </div>
  )
}
