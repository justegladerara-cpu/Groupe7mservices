import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Product } from '../lib/types'
import ProductVisual from './ProductVisual'
import { useStore } from '../lib/store'
import { allInclusiveUnitPrice, productPrice } from '../lib/pricing'
import { useMoney } from '../lib/format'
import { Stars } from './ui'

export const fmtSold = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} k` : String(n))

export default function ProductCard({ p, compact }: { p: Product; compact?: boolean }) {
  const settings = useStore((s) => s.settings)
  const reviews = useStore((s) => s.reviews.filter((r) => r.productId === p.id && r.status === 'publie'))
  const liked = useStore((s) => s.wishlist.includes(p.id))
  const toggle = useStore((s) => s.toggleWishlist)
  const money = useMoney()
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0
  const price = productPrice(p, settings)
  const full = allInclusiveUnitPrice(p.supplierPriceUsd, p.weightKg, settings)
  return (
    <Link to={`/produit/${p.id}`} className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${compact ? 'w-40 shrink-0 sm:w-48' : ''}`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        <ProductVisual glyph={p.glyph} hue={p.hue} image={p.image} className="transition duration-300 group-hover:scale-105" />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {p.promoPct > 0 && <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">-{p.promoPct} %</span>}
          {p.isNew && <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Nouveau</span>}
          {!p.isNew && !p.promoPct && p.featured && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800">Tendance</span>}
        </div>
        <button
          aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id) }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm hover:text-rose-600"
        >
          <Heart size={16} className={liked ? 'fill-rose-600 text-rose-600' : ''} />
        </button>
      </div>
      <div className="p-3">
        {!compact && <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{p.category}</div>}
        <div className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800">{p.name}</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className={`text-base font-bold ${p.promoPct ? 'text-rose-600' : 'text-brand-800'}`}>{money(price)}</span>
          {p.promoPct > 0 && <span className="text-xs text-slate-400 line-through">{money(full)}</span>}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>{fmtSold(p.sold)} vendus</span>
          {reviews.length > 0 && <span className="flex items-center gap-1"><Stars value={Math.round(avg)} size={10} />{reviews.length}</span>}
        </div>
        {!compact && <div className="mt-1 text-[10px] font-medium text-emerald-700">Tout compris · douane incluse</div>}
      </div>
    </Link>
  )
}
