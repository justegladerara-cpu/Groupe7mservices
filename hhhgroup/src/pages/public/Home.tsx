import { Link } from 'react-router-dom'
import { ArrowRight, CreditCard, Link2, MapPin, ShieldCheck, Bell, Scale, Smartphone, Package, Truck, Search, Star } from 'lucide-react'
import { useStore } from '../../lib/store'
import ProductCard from '../../components/ProductCard'
import { Stars } from '../../components/ui'
import { daysBetween, fmtDate } from '../../lib/format'
import { CATEGORIES } from '../../lib/constants'

export default function Home() {
  const products = useStore((s) => s.products.filter((p) => p.active))
  const orders = useStore((s) => s.orders)
  const reviews = useStore((s) => s.reviews.filter((r) => r.status === 'publie'))
  const users = useStore((s) => s.users)
  const delivered = orders.filter((o) => o.status === 'livree')
  const avgDays = delivered.length ? Math.round(delivered.reduce((a, o) => a + daysBetween(o.createdAt, o.deliveredAt!), 0) / delivered.length) : 0
  const onTime = delivered.length ? Math.round((delivered.filter((o) => o.deliveredAt! <= o.promisedDate).length / delivered.length) * 100) : 0
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '—'
  const featured = products.filter((p) => p.featured).slice(0, 8)

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-400 ring-1 ring-white/20">
              <MapPin size={12} /> République du Congo · Brazzaville & Pointe-Noire
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">Le commerce international, <span className="text-gold-400">enfin simple</span> pour le Congo.</h1>
            <p className="mt-4 max-w-lg text-lg text-brand-100">« Tu choisis, tu paies, nous nous occupons du reste. » Achète sur SHEIN et les grandes boutiques internationales, paie en Mobile Money, reçois ton colis chez toi.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/catalogue" className="btn-gold px-5 py-3 text-base">Voir le catalogue <ArrowRight size={18} /></Link>
              <Link to="/lien" className="btn border border-white/30 bg-white/10 px-5 py-3 text-base text-white hover:bg-white/20"><Link2 size={18} /> Coller un lien</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-100">
              <span className="flex items-center gap-2"><Smartphone size={16} className="text-gold-400" /> MTN MoMo · Airtel Money</span>
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-gold-400" /> Prix tout compris</span>
              <span className="flex items-center gap-2"><Bell size={16} className="text-gold-400" /> Suivi WhatsApp</span>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="card absolute right-6 top-2 w-72 rotate-2 p-4 text-slate-800 shadow-2xl">
              <div className="text-xs font-semibold uppercase text-slate-400">Commande HHH-1148</div>
              <div className="mt-2 space-y-2.5">
                {[['Paiement confirmé', true], ['Acheté chez le fournisseur', true], ['En transit international', true], ['Dédouanement', false], ['Livraison', false]].map(([l, d]) => (
                  <div key={l as string} className="flex items-center gap-2 text-sm">
                    <span className={`h-3 w-3 rounded-full ${d ? 'bg-brand-600' : 'bg-slate-200'}`} />
                    <span className={d ? 'font-medium' : 'text-slate-400'}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card absolute bottom-0 left-4 w-72 -rotate-2 p-4 text-slate-800 shadow-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Bell size={16} />WhatsApp · HHHGroup</div>
              <p className="mt-2 text-sm text-slate-600">Grace, ton colis HHH-1148 est arrivé à Brazzaville. Nous gérons la douane, rien à faire de ton côté. 🎉</p>
            </div>
          </div>
        </div>
      </section>

      {/* CHIFFRES CONFIANCE */}
      <section className="mx-auto -mt-8 max-w-5xl px-4">
        <div className="card relative grid grid-cols-2 divide-slate-100 md:grid-cols-4 md:divide-x">
          {[
            [`${delivered.length}+`, 'colis livrés'],
            [`${avgDays} j`, 'délai moyen constaté'],
            [`${onTime} %`, 'livrés dans le délai annoncé'],
            [`${avgRating}/5`, `${reviews.length} avis vérifiés`],
          ].map(([v, l]) => (
            <div key={l} className="p-4 text-center">
              <div className="text-2xl font-extrabold text-brand-800">{v}</div>
              <div className="text-xs text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 GESTES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Trois gestes. C’est tout.</h2>
          <p className="mt-2 text-slate-500">Nous absorbons toute la complexité du commerce international.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { i: <Search />, t: '1. Tu choisis', d: 'Dans notre catalogue tendance ou en collant le lien d’un article SHEIN, AliExpress…' },
            { i: <Smartphone />, t: '2. Tu paies', d: 'En Mobile Money, en un clic. Un seul prix, tout compris, affiché avant de valider.' },
            { i: <Package />, t: '3. Tu reçois', d: 'Achat, transit, douane : on gère. Tu es notifiée à chaque étape jusqu’à la livraison.' },
          ].map((s) => (
            <div key={s.t} className="card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">{s.i}</div>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATÉGORIES */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((c) => <Link key={c} to={`/catalogue?cat=${encodeURIComponent(c)}`} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-800">{c}</Link>)}
        </div>
      </section>

      {/* PRODUITS */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Les tendances du moment</h2>
            <p className="text-sm text-slate-500">Les articles que tout Brazzaville veut, prix livrés au Congo.</p>
          </div>
          <Link to="/catalogue" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 sm:flex">Tout voir <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* LIEN */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-gold-500 to-amber-400 p-8 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Tu as vu un article sur SHEIN ou TikTok ?</h2>
            <p className="mt-2 text-slate-800">Colle simplement le lien. Notre équipe te donne le prix tout compris, livré au Congo — en général le jour même.</p>
          </div>
          <div className="md:text-right"><Link to="/lien" className="btn bg-slate-900 px-6 py-3 text-base text-white hover:bg-slate-800"><Link2 size={18} />Coller un lien</Link></div>
        </div>
      </section>

      {/* PROMESSE */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-slate-900">Ce que nous supprimons pour toi</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: <CreditCard />, t: 'Pas de carte internationale ?', d: 'Paiement 100 % local via Mobile Money, converti en interne.' },
            { i: <MapPin />, t: 'Pas d’adresse à l’étranger ?', d: 'Nous recevons tes articles à notre adresse internationale, c’est transparent pour toi.' },
            { i: <ShieldCheck />, t: 'Peur de l’arnaque ?', d: 'Une marque, une plateforme, un historique de commande et des avis clients visibles.' },
            { i: <Bell />, t: 'Aucun suivi ?', d: 'Notifications automatiques WhatsApp / SMS / e-mail à chaque étape.' },
            { i: <Scale />, t: 'La douane, c’est compliqué ?', d: 'Elle est gérée entièrement par HHHGroup, invisible pour toi.' },
            { i: <Truck />, t: 'Prix imprévisible ?', d: 'Un seul prix affiché, tout compris, avant validation de la commande.' },
          ].map((v) => (
            <div key={v.t} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{v.i}</div>
              <div>
                <div className="font-semibold text-slate-900">{v.t}</div>
                <p className="mt-0.5 text-sm text-slate-600">{v.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AVIS */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Elles nous font confiance</h2>
              <p className="mt-1 flex items-center gap-2 text-slate-500"><Star size={16} className="fill-gold-500 text-gold-500" /> {avgRating}/5 sur {reviews.length} avis de clients livrés</p>
            </div>
            <Link to="/avis" className="hidden text-sm font-semibold text-brand-700 sm:block">Tous les avis →</Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 6).map((r) => {
              const u = users.find((x) => x.id === r.customerId)
              return (
                <figure key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <Stars value={r.rating} />
                  <blockquote className="mt-3 text-sm text-slate-700">« {r.comment} »</blockquote>
                  <figcaption className="mt-4 text-xs text-slate-500"><span className="font-semibold text-slate-700">{u?.name.split(' ')[0]} {u?.name.split(' ')[1]?.[0]}.</span> · {u?.commune} · {fmtDate(r.at)} · <span className="text-emerald-700">Achat vérifié</span></figcaption>
                </figure>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
