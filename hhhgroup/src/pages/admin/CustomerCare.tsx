import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MessageCircle, Check, EyeOff } from 'lucide-react'
import { useStore, useCurrentUser } from '../../lib/store'
import { PageTitle, Pill, Modal, Field, Empty, StatusBadge, Stars } from '../../components/ui'
import { useMoney, fmtDate, fmtDateTime, waLink } from '../../lib/format'
import { CLAIM_REASON, CLAIM_STATUS, CHANNEL_LABEL } from '../../lib/constants'
import type { Claim, Channel, Template } from '../../lib/types'

export function Customers() {
  const users = useStore((s) => s.users.filter((u) => u.role === 'client'))
  const orders = useStore((s) => s.orders)
  const claims = useStore((s) => s.claims)
  const money = useMoney()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const rows = useMemo(() => users.map((u) => {
    const os = orders.filter((o) => o.customerId === u.id && o.status !== 'annulee')
    return { u, count: os.length, spent: os.filter((o) => o.paidAt).reduce((a, o) => a + o.total, 0), last: os[0]?.createdAt }
  }).filter((r) => !q || `${r.u.name} ${r.u.phone} ${r.u.email} ${r.u.commune}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.spent - a.spent), [users, orders, q])
  const c = rows.find((r) => r.u.id === sel)
  return (
    <div>
      <PageTitle title="Clients" sub={`${users.length} clients · ${rows.filter((r) => r.count > 1).length} clients fidèles (2+ commandes)`} />
      <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Nom, téléphone, commune…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-slate-100 bg-slate-50"><tr><th className="table-head">Client</th><th className="table-head">Contact</th><th className="table-head">Commune</th><th className="table-head">Commandes</th><th className="table-head">Total dépensé</th><th className="table-head">Dernière</th><th className="table-head">Parrainage</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.u.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSel(r.u.id)}>
                <td className="table-cell font-semibold">{r.u.name}{r.count > 1 && <Pill tone="green">Fidèle</Pill>}</td>
                <td className="table-cell text-xs">{r.u.phone}<div className="text-slate-400">{r.u.email}</div></td>
                <td className="table-cell">{r.u.commune}</td>
                <td className="table-cell">{r.count}</td>
                <td className="table-cell font-semibold">{money(r.spent)}</td>
                <td className="table-cell text-xs text-slate-500">{fmtDate(r.last)}</td>
                <td className="table-cell text-xs">{r.u.referralCode}{r.u.referredBy && <div className="text-slate-400">parrainé par {r.u.referredBy}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!c} onClose={() => setSel(null)} title={c?.u.name ?? ''} wide>
        {c && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Commandes</div><div className="text-xl font-bold">{c.count}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Dépensé</div><div className="text-xl font-bold">{money(c.spent)}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Crédit</div><div className="text-xl font-bold">{money(c.u.credit)}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Réclamations</div><div className="text-xl font-bold">{claims.filter((x) => x.customerId === c.u.id).length}</div></div>
            </div>
            <div className="text-sm">{c.u.phone} · {c.u.email} · {c.u.commune} {c.u.address && `· ${c.u.address}`} · client depuis le {fmtDate(c.u.createdAt)}</div>
            <a href={waLink(c.u.phone, `Bonjour ${c.u.name.split(' ')[0]}, c’est l’équipe HHHGroup.`)} target="_blank" rel="noreferrer" className="btn-outline btn-sm text-emerald-700"><MessageCircle size={14} />WhatsApp</a>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {orders.filter((o) => o.customerId === c.u.id).map((o) => <Link key={o.id} to={`/admin/commandes/${o.id}`} className="flex items-center justify-between p-3 text-sm hover:bg-slate-50"><span className="font-semibold">{o.number}</span><span className="text-xs text-slate-500">{fmtDate(o.createdAt)}</span><StatusBadge status={o.status} /><b>{money(o.total)}</b></Link>)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function Claims() {
  const me = useCurrentUser()!
  const claims = useStore((s) => s.claims)
  const orders = useStore((s) => s.orders)
  const users = useStore((s) => s.users)
  const { replyClaim, updateClaim } = useStore((s) => ({ replyClaim: s.replyClaim, updateClaim: s.updateClaim }))
  const money = useMoney()
  const [sel, setSel] = useState<string | null>(claims[0]?.id ?? null)
  const [text, setText] = useState('')
  const [res, setRes] = useState<{ resolution: Claim['resolution']; amount: string }>({ resolution: 'avoir', amount: '' })
  const c = claims.find((x) => x.id === sel)
  const o = orders.find((x) => x.id === c?.orderId)
  const u = users.find((x) => x.id === c?.customerId)
  return (
    <div>
      <PageTitle title="Réclamations & litiges" sub={`${claims.filter((x) => x.status === 'ouverte' || x.status === 'en_cours').length} à traiter · politique : remboursement, avoir ou renvoi`} />
      {!claims.length ? <Empty title="Aucune réclamation" /> : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="card divide-y divide-slate-100">
            {claims.map((x) => (
              <button key={x.id} onClick={() => setSel(x.id)} className={`block w-full p-3 text-left text-sm ${sel === x.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between"><b>{x.number}</b><Pill tone={x.status === 'ouverte' ? 'red' : x.status === 'en_cours' ? 'amber' : x.status === 'resolue' ? 'green' : 'slate'}>{CLAIM_STATUS[x.status]}</Pill></div>
                <div className="text-slate-600">{CLAIM_REASON[x.reason]} · {users.find((y) => y.id === x.customerId)?.name}</div>
                <div className="text-xs text-slate-400">{fmtDateTime(x.createdAt)}</div>
              </button>
            ))}
          </div>
          {c && (
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-lg font-bold">{c.number} — {CLAIM_REASON[c.reason]}</h3><div className="text-sm text-slate-500">{u?.name} · <Link to={`/admin/commandes/${o?.id}`} className="text-brand-700">{o?.number}</Link> ({o && money(o.total)})</div></div>
                <a href={waLink(u?.phone ?? '', `Bonjour ${u?.name.split(' ')[0]}, au sujet de votre réclamation ${c.number} :`)} target="_blank" rel="noreferrer" className="btn-outline btn-sm text-emerald-700"><MessageCircle size={14} />WhatsApp</a>
              </div>
              <div className="mt-4 space-y-2">
                {c.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.from === 'equipe' ? 'justify-end' : ''}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === 'equipe' ? 'bg-brand-700 text-white' : 'bg-slate-100'}`}>{m.text}<div className={`mt-1 text-[10px] ${m.from === 'equipe' ? 'text-brand-200' : 'text-slate-400'}`}>{m.author} · {fmtDateTime(m.at)}</div></div>
                  </div>
                ))}
              </div>
              {(c.status === 'ouverte' || c.status === 'en_cours') && (
                <>
                  <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text) { replyClaim(c.id, 'equipe', me.name, text); setText('') } }}>
                    <input className="input" placeholder="Répondre au client…" value={text} onChange={(e) => setText(e.target.value)} />
                    <button className="btn-primary">Envoyer</button>
                  </form>
                  <div className="mt-5 rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 text-sm font-bold">Clôturer</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Solution"><select className="input" value={res.resolution} onChange={(e) => setRes({ ...res, resolution: e.target.value as Claim['resolution'] })}><option value="remboursement">Remboursement Mobile Money</option><option value="avoir">Avoir (crédit compte)</option><option value="renvoi">Renvoi de l’article</option><option value="aucune">Aucune</option></select></Field>
                      {(res.resolution === 'remboursement' || res.resolution === 'avoir') && <Field label="Montant"><input type="number" className="input" value={res.amount} onChange={(e) => setRes({ ...res, amount: e.target.value })} /></Field>}
                    </div>
                    {res.resolution === 'remboursement' && <p className="mt-2 text-xs text-amber-700">Le remboursement Mobile Money automatique sera raccordé avec le module de paiement. En attendant, il est enregistré et effectué manuellement.</p>}
                    <div className="mt-3 flex gap-2">
                      <button className="btn-primary btn-sm" onClick={() => updateClaim(c.id, { status: 'resolue', resolution: res.resolution, refundAmount: Number(res.amount) || undefined }, me.name)}><Check size={14} />Résoudre</button>
                      <button className="btn-outline btn-sm" onClick={() => updateClaim(c.id, { status: 'rejetee', resolution: 'aucune' }, me.name)}>Rejeter</button>
                    </div>
                  </div>
                </>
              )}
              {c.resolution && c.status === 'resolue' && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Résolue le {fmtDate(c.closedAt)} · {c.resolution}{c.refundAmount ? ` · ${money(c.refundAmount)}` : ''}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ReviewsAdmin() {
  const reviews = useStore((s) => s.reviews)
  const users = useStore((s) => s.users)
  const orders = useStore((s) => s.orders)
  const moderate = useStore((s) => s.moderateReview)
  const [tab, setTab] = useState<'en_attente' | 'publie' | 'masque'>('en_attente')
  const list = reviews.filter((r) => r.status === tab)
  return (
    <div>
      <PageTitle title="Avis clients" sub="Les avis visibles sont un pilier de la confiance. Seuls les clients livrés peuvent en laisser." />
      <div className="mb-4 flex gap-2">{(['en_attente', 'publie', 'masque'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{{ en_attente: 'À valider', publie: 'Publiés', masque: 'Masqués' }[t]} ({reviews.filter((r) => r.status === t).length})</button>)}</div>
      {!list.length && <Empty title="Rien ici" />}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-slate-400">{fmtDate(r.at)}</span></div>
            <p className="mt-2 text-sm">{r.comment}</p>
            <div className="mt-2 text-xs text-slate-500">{users.find((u) => u.id === r.customerId)?.name} · {orders.find((o) => o.id === r.orderId)?.number}</div>
            <div className="mt-3 flex gap-2">
              {r.status !== 'publie' && <button className="btn-primary btn-sm" onClick={() => moderate(r.id, 'publie')}><Check size={14} />Publier</button>}
              {r.status !== 'masque' && <button className="btn-outline btn-sm" onClick={() => moderate(r.id, 'masque')}><EyeOff size={14} />Masquer</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CHANNELS: Channel[] = ['whatsapp', 'sms', 'email', 'app']
const TPL_LABEL: Record<string, string> = { bienvenue: 'Inscription', attente_paiement: 'Commande créée', paiement_confirme: 'Paiement confirmé', achat_fournisseur: 'Achat fournisseur', en_transit: 'En transit', dedouanement: 'Arrivée / douane', en_livraison: 'En livraison', livree: 'Livrée', annulee: 'Annulée', devis_pret: 'Devis lien prêt', reclamation_maj: 'Réclamation mise à jour' }

export function NotificationsAdmin() {
  const notifs = useStore((s) => s.notifications)
  const users = useStore((s) => s.users)
  const templates = useStore((s) => s.templates)
  const upsert = useStore((s) => s.upsert)
  const [tab, setTab] = useState<'log' | 'tpl'>('log')
  const [edit, setEdit] = useState<Template | null>(null)
  return (
    <div>
      <PageTitle title="Notifications automatiques" sub="Chaque étape déclenche un message au client. Les envois WhatsApp / SMS / e-mail sont simulés tant que les passerelles ne sont pas raccordées." />
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('log')} className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === 'log' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Journal d’envoi ({notifs.length})</button>
        <button onClick={() => setTab('tpl')} className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === 'tpl' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Modèles de messages</button>
      </div>
      {tab === 'log' ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-slate-100 bg-slate-50"><tr><th className="table-head">Date</th><th className="table-head">Client</th><th className="table-head">Message</th><th className="table-head">Canaux</th><th className="table-head">État</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {notifs.slice(0, 150).map((n) => (
                <tr key={n.id}><td className="table-cell whitespace-nowrap text-xs text-slate-500">{fmtDateTime(n.at)}</td><td className="table-cell">{users.find((u) => u.id === n.customerId)?.name}</td><td className="table-cell max-w-md"><b className="text-sm">{n.title}</b><div className="truncate text-xs text-slate-500">{n.body}</div></td><td className="table-cell text-xs">{n.channels.map((c) => CHANNEL_LABEL[c]).join(', ')}</td><td className="table-cell"><Pill tone="amber">Simulé</Pill></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between"><Pill tone="violet">{TPL_LABEL[t.id]}</Pill><button className="btn-ghost btn-sm" onClick={() => setEdit(t)}>Modifier</button></div>
              <div className="mt-2 font-semibold">{t.title}</div>
              <p className="mt-1 text-sm text-slate-600">{t.body}</p>
              <div className="mt-2 text-xs text-slate-500">{t.channels.map((c) => CHANNEL_LABEL[c]).join(' · ')}</div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Modifier le modèle">
        {edit && (
          <div className="space-y-3">
            <Field label="Titre"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Message" hint="Variables : {prenom} {numero} {total} {date_promise} {suivi} {mode_livraison} {marque}"><textarea className="input" rows={4} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <div className="flex flex-wrap gap-3">{CHANNELS.map((c) => <label key={c} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-brand-700" checked={edit.channels.includes(c)} onChange={() => setEdit({ ...edit, channels: edit.channels.includes(c) ? edit.channels.filter((x) => x !== c) : [...edit.channels, c] })} />{CHANNEL_LABEL[c]}</label>)}</div>
            <button className="btn-primary w-full" onClick={() => { upsert('templates', edit as never); setEdit(null) }}>Enregistrer</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
