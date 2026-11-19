import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom'
import { Search, ShieldCheck, Truck, Smartphone, Minus, Plus, Check, ChevronLeft, Package, Heart, Ruler, Share2, Flame, Zap, SlidersHorizontal } from 'lucide-react'
import Countdown from '../../components/Countdown'
import { fmtSold } from '../../components/ProductCard'
import { useStore } from '../../lib/store'
import ProductCard from '../../components/ProductCard'
import ProductVisual from '../../components/ProductVisual'
import { CATEGORIES } from '../../lib/constants'
import { allInclusiveUnitPrice, deliveryWindow, productPrice } from '../../lib/pricing'
import { useMoney, fmtDate } from '../../lib/format'
import { Stars, Empty, Modal } from '../../components/ui'

const PRICE_RANGES: [string, number, number][] = [['Moins de 15 000', 0, 15000], ['15 000 – 25 000', 15000, 25000], ['25 000 – 40 000', 25000, 40000], ['Plus de 40 000', 40000, Infinity]]

export function Catalogue() {
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') ?? ''
  const promo = params.get('promo') === '1'
  const isNew = params.get('new') === '1'
  const range = params.get('prix') ?? ''
  const sort = params.get('sort') ?? 'pop'
  const [q, setQ] = useState(params.get('q') ?? '')
  useEffect(() => setQ(params.get('q') ?? ''), [params])
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n) }
  const list = useMemo(() => {
    const price = (p: typeof products[0]) => productPrice(p, settings)
    const rg = PRICE_RANGES.find((r) => r[0] === range)
    let l = products.filter((p) => p.active && (!cat || p.category === cat) && (!promo || p.promoPct > 0) && (!isNew || p.isNew)
      && (!rg || (price(p) >= rg[1] && price(p) < rg[2]))
      && (!q || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q.toLowerCase())))
    const sorters: Record<string, (a: typeof l[0], b: typeof l[0]) => number> = {
      pop: (a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold,
      sold: (a, b) => b.sold - a.sold,
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      asc: (a, b) => price(a) - price(b),
      desc: (a, b) => price(b) - price(a),
      promo: (a, b) => b.promoPct - a.promoPct,
    }
    l = [...l].sort(sorters[sort] ?? sorters.pop)
    return l
  }, [products, cat, q, sort, settings, promo, isNew, range])
  const chip = (on: boolean) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${on ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">{cat || (promo ? 'Ventes flash' : isNew ? 'Nouveautés' : 'Catalogue')}</h1>
      <p className="mt-1 text-sm text-slate-500">Tous les prix sont <b className="text-emerald-700">tout compris</b> : produit, service, transport international et douane.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setParam('q', q) }}>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Rechercher une robe, des baskets, un parfum…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <select className="input sm:w-56" value={sort} onChange={(e) => setParam('sort', e.target.value === 'pop' ? '' : e.target.value)} aria-label="Trier">
          <option value="pop">Recommandés</option>
          <option value="sold">Meilleures ventes</option>
          <option value="new">Nouveautés</option>
          <option value="promo">Plus grosses remises</option>
          <option value="asc">Prix croissant</option>
          <option value="desc">Prix décroissant</option>
        </select>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setParam('cat', '')} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${!cat ? 'bg-brand-700 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Tout</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setParam('cat', c)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${cat === c ? 'bg-brand-700 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{c}</button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-2">
        <SlidersHorizontal size={16} className="shrink-0 text-slate-400" />
        <button className={chip(promo)} onClick={() => setParam('promo', promo ? '' : '1')}>En promo</button>
        <button className={chip(isNew)} onClick={() => setParam('new', isNew ? '' : '1')}>Nouveautés</button>
        {PRICE_RANGES.map((r) => <button key={r[0]} className={chip(range === r[0])} onClick={() => setParam('prix', range === r[0] ? '' : r[0])}>{r[0]} FCFA</button>)}
      </div>
      <div className="mt-2 text-xs text-slate-500">{list.length} article(s)</div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {list.length === 0 && <Empty icon={<Package size={32} />} title="Aucun article trouvé" text="Tu ne trouves pas ? Colle directement le lien de l’article, on s’en occupe." action={<Link to="/lien" className="btn-primary">Commander par lien</Link>} />}
    </div>
  )
}

export function Wishlist() {
  const ids = useStore((s) => s.wishlist)
  const products = useStore((s) => s.products)
  const list = ids.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p)
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900"><Heart className="fill-rose-600 text-rose-600" />Mes favoris</h1>
      <p className="mt-1 text-sm text-slate-500">Garde ici les articles qui te plaisent et commande-les quand tu veux.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {!list.length && <Empty icon={<Heart size={32} />} title="Aucun favori pour l’instant" text="Touche le cœur sur un article pour le retrouver ici." action={<Link to="/catalogue" className="btn-primary">Voir le catalogue</Link>} />}
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
  const [guide, setGuide] = useState(false)
  const liked = useStore((s) => s.wishlist.includes(id ?? ''))
  const toggleWish = useStore((s) => s.toggleWishlist)
  const addRecent = useStore((s) => s.addRecent)
  const bought = useStore((s) => s.products.filter((x) => x.active && x.id !== id && x.category !== p?.category).sort((a, b) => b.sold - a.sold).slice(0, 4))
  useEffect(() => { if (id) addRecent(id) }, [id, addRecent])
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-16"><Empty title="Article introuvable" action={<Link to="/catalogue" className="btn-primary">Retour au catalogue</Link>} /></div>
  const price = productPrice(p, settings)
  const full = allInclusiveUnitPrice(p.supplierPriceUsd, p.weightKg, settings)
  const etaMin = new Date(); etaMin.setDate(etaMin.getDate() + settings.standardDaysMin)
  const shareText = `Regarde cet article sur HHHGroup : ${p.name} à ${money(price)} livré au Congo ! ${window.location.href}`
  const isClothes = ['Mode femme', 'Mode homme', 'Chaussures'].includes(p.category)
  const needSize = p.sizes.length > 1, needColor = p.colors.length > 1
  const s = size || (needSize ? '' : p.sizes[0]), c = color || (needColor ? '' : p.colors[0])
  const valid = !!s && !!c
  const eta = new Date(); eta.setDate(eta.getDate() + settings.standardDaysMax)
  const add = (go?: boolean) => { addToCart({ productId: p.id, size: s, color: c, qty }); setAdded(true); if (go) nav('/panier') }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:pb-6">
      <button onClick={() => nav(-1)} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ChevronLeft size={16} />Retour</button>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white md:aspect-[4/5]"><ProductVisual glyph={p.glyph} hue={p.hue} image={p.image} /></div>
        <div>
          <div className="text-sm font-medium text-brand-700">{p.category}</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            {reviews.length > 0 && <span className="flex items-center gap-2"><Stars value={Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length)} />{reviews.length} avis vérifiés</span>}
            <span className="flex items-center gap-1"><Flame size={14} className="text-orange-500" />{fmtSold(p.sold)} vendus</span>
            <button onClick={() => toggleWish(p.id)} className="flex items-center gap-1 hover:text-rose-600"><Heart size={14} className={liked ? 'fill-rose-600 text-rose-600' : ''} />{liked ? 'Dans mes favoris' : 'Ajouter aux favoris'}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-emerald-700"><Share2 size={14} />Partager</a>
          </div>
          {p.promoPct > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-2 text-white">
              <span className="flex items-center gap-1 text-sm font-bold"><Zap size={16} className="fill-yellow-300 text-yellow-300" />Vente flash -{p.promoPct} %</span>
              <span className="flex items-center gap-2 text-xs">Fin dans <Countdown /></span>
            </div>
          )}
          <div className={`${p.promoPct > 0 ? 'rounded-b-2xl' : 'mt-5 rounded-2xl'} bg-emerald-50 p-4`}>
            <div className="flex flex-wrap items-baseline gap-3"><span className={`text-3xl font-extrabold ${p.promoPct ? 'text-rose-600' : 'text-slate-900'}`}>{money(price)}</span>{p.promoPct > 0 && <span className="text-lg text-slate-400 line-through">{money(full)}</span>}</div>
            <div className="mt-1 text-sm font-medium text-emerald-800">Prix final tout compris, livré au Congo</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-900/80">
              {['Produit', 'Service HHHGroup', 'Transport international', 'Douane'].map((x) => <span key={x} className="flex items-center gap-1"><Check size={12} />{x}</span>)}
            </div>
          </div>
          <p className="mt-5 text-slate-600">{p.description}</p>
          {needSize && (
            <div className="mt-5">
              <div className="flex items-center justify-between"><div className="label">Taille</div>{isClothes && <button onClick={() => setGuide(true)} className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-700"><Ruler size={13} />Guide des tailles</button>}</div>
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
          <div className="mt-6 hidden flex-col gap-2 sm:flex sm:flex-row">
            <button disabled={!valid} onClick={() => add(true)} className="btn-primary flex-1 py-3 text-base">Commander maintenant</button>
            <button disabled={!valid} onClick={() => add()} className="btn-outline flex-1 py-3 text-base">{added ? <><Check size={18} />Ajouté</> : 'Ajouter au panier'}</button>
          </div>
          {!valid && <p className="mt-2 text-xs text-amber-700">Choisis {!s && needSize ? 'une taille' : ''}{!s && needSize && !c && needColor ? ' et ' : ''}{!c && needColor ? 'une couleur' : ''} pour continuer.</p>}
          <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex gap-3"><Truck size={18} className="text-brand-700" /><div><b>Livraison estimée entre le {fmtDate(etaMin.toISOString())} et le {fmtDate(eta.toISOString())}</b><div className="text-slate-500">Standard {deliveryWindow('domicile', settings)} · point relais offert dès {money(settings.freeRelayThreshold)} d’articles</div></div></div>
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
          <h2 className="text-xl font-bold">Vous aimerez aussi</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{similar.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
      {bought.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Souvent achetés par nos clientes</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{bought.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
      <div className="fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-slate-200 bg-white p-3 sm:hidden">
        <button aria-label="Favori" onClick={() => toggleWish(p.id)} className="btn-outline px-3"><Heart size={18} className={liked ? 'fill-rose-600 text-rose-600' : ''} /></button>
        <button disabled={!valid} onClick={() => add()} className="btn-outline flex-1">{added ? 'Ajouté ✓' : 'Panier'}</button>
        <button disabled={!valid} onClick={() => add(true)} className="btn-primary flex-[1.4]">Commander · {money(price * qty)}</button>
      </div>
      <Modal open={guide} onClose={() => setGuide(false)} title="Guide des tailles">
        {p.category === 'Chaussures' ? (
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="py-1">Pointure EU</th><th>Longueur du pied</th></tr></thead><tbody className="divide-y divide-slate-100">{[[36, 23], [37, 23.5], [38, 24], [39, 25], [40, 25.5], [41, 26], [42, 26.5], [43, 27.5], [44, 28], [45, 29]].map(([a, b]) => <tr key={a}><td className="py-1.5">{a}</td><td>{b} cm</td></tr>)}</tbody></table>
        ) : (
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="py-1">Taille</th><th>Tour de poitrine</th><th>Tour de taille</th><th>Tour de hanches</th></tr></thead><tbody className="divide-y divide-slate-100">{[['XS', '80-84', '60-64', '86-90'], ['S', '84-88', '64-68', '90-94'], ['M', '88-94', '68-74', '94-100'], ['L', '94-100', '74-80', '100-106'], ['XL', '100-106', '80-86', '106-112'], ['XXL', '106-114', '86-94', '112-120']].map((r) => <tr key={r[0]}><td className="py-1.5 font-semibold">{r[0]}</td><td>{r[1]} cm</td><td>{r[2]} cm</td><td>{r[3]} cm</td></tr>)}</tbody></table>
        )}
        <p className="mt-3 text-xs text-slate-500">Les tailles des boutiques asiatiques taillent souvent petit : en cas de doute, prends la taille au-dessus. Demande conseil à l’assistant ou sur WhatsApp.</p>
      </Modal>
    </div>
  )
}
