import { useState } from 'react'
import { CheckCircle2, Circle, RotateCcw, Plus, Pencil, Plug, Calculator, MapPin } from 'lucide-react'
import { useStore, useCurrentUser } from '../../lib/store'
import { PageTitle, Pill, Modal, Field } from '../../components/ui'
import { useMoney, fmtDate, fmtDateTime, uid } from '../../lib/format'
import { allInclusiveUnitPrice, unitCostParts } from '../../lib/pricing'
import type { Risk, City, Settings as S, User } from '../../lib/types'
import { DEFAULT_SETTINGS } from '../../lib/seed'

export function Pilotage() {
  const roadmap = useStore((s) => s.roadmap)
  const risks = useStore((s) => s.risks)
  const cities = useStore((s) => s.cities)
  const { toggleRoadmap, upsert } = useStore((s) => ({ toggleRoadmap: s.toggleRoadmap, upsert: s.upsert }))
  const [risk, setRisk] = useState<Risk | null>(null)
  const [city, setCity] = useState<City | null>(null)
  const phases = [...new Set(roadmap.map((r) => r.phase))]
  const done = roadmap.filter((r) => r.done).length
  const reviewDue = risks.filter((r) => (Date.now() - new Date(r.lastReview).getTime()) / 86400000 > 30)
  return (
    <div>
      <PageTitle title="Lancement & risques" sub="Roadmap 0-90 jours, registre des risques revu chaque mois, plan d’expansion." />
      <div className="card p-5">
        <div className="flex items-center justify-between"><h3 className="font-bold">Roadmap de lancement</h3><span className="text-sm text-slate-500">{done}/{roadmap.length} étapes</span></div>
        <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(done / roadmap.length) * 100}%` }} /></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {phases.map((p) => (
            <div key={p} className="rounded-xl bg-slate-50 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">{p}</div>
              {roadmap.filter((r) => r.phase === p).map((r) => (
                <button key={r.id} onClick={() => toggleRoadmap(r.id)} className="flex w-full items-start gap-2 py-1 text-left text-sm">
                  {r.done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={16} className="mt-0.5 shrink-0 text-slate-300" />}
                  <span className={r.done ? 'text-slate-500 line-through' : ''}>{r.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">Registre des risques</h3>
          <div className="flex items-center gap-2">
            {reviewDue.length > 0 && <Pill tone="red">{reviewDue.length} revue(s) mensuelle(s) en retard</Pill>}
            <button className="btn-outline btn-sm" onClick={() => setRisk({ id: uid('rsk-'), title: '', impact: 'Moyen', probability: 'Moyenne', mitigation: '', owner: '', status: 'ouvert', lastReview: new Date().toISOString().slice(0, 10) })}><Plus size={14} />Risque</button>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">Un risque non écrit est un risque non géré. À revoir chaque mois pendant les 6 premiers mois.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-slate-100"><tr><th className="table-head">Risque</th><th className="table-head">Impact</th><th className="table-head">Probabilité</th><th className="table-head">Mitigation</th><th className="table-head">Statut</th><th className="table-head">Revu le</th><th className="table-head" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {risks.map((r) => (
                <tr key={r.id}>
                  <td className="table-cell font-semibold">{r.title}<div className="text-xs font-normal text-slate-400">{r.owner}</div></td>
                  <td className="table-cell"><Pill tone={r.impact === 'Élevé' ? 'red' : r.impact === 'Moyen' ? 'amber' : 'slate'}>{r.impact}</Pill></td>
                  <td className="table-cell text-sm">{r.probability}</td>
                  <td className="table-cell max-w-sm text-sm text-slate-600">{r.mitigation}</td>
                  <td className="table-cell"><Pill tone={r.status === 'maitrise' ? 'green' : r.status === 'clos' ? 'slate' : 'amber'}>{{ ouvert: 'Ouvert', maitrise: 'Maîtrisé', clos: 'Clos' }[r.status]}</Pill></td>
                  <td className="table-cell text-xs">{fmtDate(r.lastReview)}</td>
                  <td className="table-cell text-right"><button className="btn-ghost btn-sm" onClick={() => setRisk(r)}><Pencil size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between"><h3 className="font-bold">Expansion : du Congo à l’Afrique centrale</h3><button className="btn-outline btn-sm" onClick={() => setCity({ id: uid('city-'), name: '', country: '', status: 'planifiee', condition: '' })}><Plus size={14} />Ville</button></div>
        <p className="mt-1 text-xs text-slate-500">Règle : ne jamais dupliquer un modèle non rentable. Chaque nouvelle ville n’ouvre qu’après preuve de rentabilité sur la précédente.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {cities.map((c) => (
            <button key={c.id} onClick={() => setCity(c)} className={`rounded-xl border p-3 text-left ${c.status === 'active' ? 'border-emerald-300 bg-emerald-50' : c.status === 'pilote' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center gap-1 font-bold"><MapPin size={14} />{c.name}</div>
              <div className="text-xs text-slate-500">{c.country}</div>
              <div className="mt-1"><Pill tone={c.status === 'active' ? 'green' : c.status === 'pilote' ? 'amber' : 'slate'}>{{ active: 'Active', pilote: 'Pilote', planifiee: 'Planifiée' }[c.status]}</Pill></div>
              <p className="mt-2 text-xs text-slate-600">{c.condition}</p>
            </button>
          ))}
        </div>
      </div>

      <Modal open={!!risk} onClose={() => setRisk(null)} title="Risque">
        {risk && (
          <div className="space-y-3">
            <Field label="Risque"><input className="input" value={risk.title} onChange={(e) => setRisk({ ...risk, title: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Impact"><select className="input" value={risk.impact} onChange={(e) => setRisk({ ...risk, impact: e.target.value as Risk['impact'] })}>{['Élevé', 'Moyen', 'Faible'].map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Probabilité"><select className="input" value={risk.probability} onChange={(e) => setRisk({ ...risk, probability: e.target.value as Risk['probability'] })}>{['Élevée', 'Moyenne', 'Faible'].map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Statut"><select className="input" value={risk.status} onChange={(e) => setRisk({ ...risk, status: e.target.value as Risk['status'] })}><option value="ouvert">Ouvert</option><option value="maitrise">Maîtrisé</option><option value="clos">Clos</option></select></Field>
            </div>
            <Field label="Mitigation"><textarea className="input" rows={3} value={risk.mitigation} onChange={(e) => setRisk({ ...risk, mitigation: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Responsable"><input className="input" value={risk.owner} onChange={(e) => setRisk({ ...risk, owner: e.target.value })} /></Field>
              <Field label="Dernière revue"><input type="date" className="input" value={risk.lastReview.slice(0, 10)} onChange={(e) => setRisk({ ...risk, lastReview: e.target.value })} /></Field>
            </div>
            <button className="btn-primary w-full" disabled={!risk.title} onClick={() => { upsert('risks', risk); setRisk(null) }}>Enregistrer</button>
          </div>
        )}
      </Modal>
      <Modal open={!!city} onClose={() => setCity(null)} title="Ville">
        {city && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville"><input className="input" value={city.name} onChange={(e) => setCity({ ...city, name: e.target.value })} /></Field>
              <Field label="Pays"><input className="input" value={city.country} onChange={(e) => setCity({ ...city, country: e.target.value })} /></Field>
            </div>
            <Field label="Statut"><select className="input" value={city.status} onChange={(e) => setCity({ ...city, status: e.target.value as City['status'] })}><option value="active">Active</option><option value="pilote">Pilote</option><option value="planifiee">Planifiée</option></select></Field>
            <Field label="Condition d’ouverture"><textarea className="input" rows={2} value={city.condition} onChange={(e) => setCity({ ...city, condition: e.target.value })} /></Field>
            <button className="btn-primary w-full" disabled={!city.name} onClick={() => { upsert('cities', city); setCity(null) }}>Enregistrer</button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function SettingsPage() {
  const me = useCurrentUser()!
  const settings = useStore((s) => s.settings)
  const staff = useStore((s) => s.users.filter((u) => u.role !== 'client'))
  const audit = useStore((s) => s.audit)
  const { updateSettings, resetDemo, upsert } = useStore((s) => ({ updateSettings: s.updateSettings, resetDemo: s.resetDemo, upsert: s.upsert }))
  const money = useMoney()
  const [f, setF] = useState<S>(settings)
  const [saved, setSaved] = useState(false)
  const [sim, setSim] = useState({ usd: 15, w: 0.4 })
  const [member, setMember] = useState<User | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const num = (k: keyof S) => ({ type: 'number', className: 'input', value: f[k] as number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) }) })
  const parts = unitCostParts(sim.usd, sim.w, f)
  const price = allInclusiveUnitPrice(sim.usd, sim.w, f)
  const margin = parts.service

  return (
    <div>
      <PageTitle title="Paramètres & prix" sub="Règle d’or : le client voit un seul montant final. Ajuste la marge après 20-30 commandes tests." actions={<button className="btn-primary" onClick={() => { updateSettings(f); setSaved(true); setTimeout(() => setSaved(false), 1500) }}>{saved ? 'Enregistré ✓' : 'Enregistrer'}</button>} />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-bold">Formule de prix tout compris</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Devise affichée"><input className="input" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field>
              <Field label="Symbole"><input className="input" value={f.currencySymbol} onChange={(e) => setF({ ...f, currencySymbol: e.target.value })} /></Field>
              <Field label="Taux (1 $ = …)"><input {...num('fxRate')} /></Field>
              <Field label="Frais de service (%)" hint="Cible 30-40 %"><input {...num('serviceFeePct')} /></Field>
              <Field label="Transport ($/kg)"><input {...num('transportPerKgUsd')} step="0.5" /></Field>
              <Field label="Poids minimum (kg)"><input {...num('minWeightKg')} step="0.1" /></Field>
              <Field label="Douane (% valeur)"><input {...num('customsPct')} /></Field>
              <Field label="Arrondi au"><input {...num('roundTo')} /></Field>
              <Field label="Validité devis (jours)"><input {...num('quoteValidityDays')} /></Field>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold">Niveaux de livraison</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Domicile"><input {...num('homeDeliveryFee')} /></Field>
              <Field label="Point relais (remise)"><input {...num('relayDeliveryFee')} /></Field>
              <Field label="Supplément express (% transport)"><input {...num('expressSurchargePct')} /></Field>
              <Field label="Relais offert dès (articles)" hint="0 = jamais offert"><input {...num('freeRelayThreshold')} /></Field>
              <Field label="Standard min (j)"><input {...num('standardDaysMin')} /></Field>
              <Field label="Standard max (j)"><input {...num('standardDaysMax')} /></Field>
              <div />
              <Field label="Express min (j)"><input {...num('expressDaysMin')} /></Field>
              <Field label="Express max (j)"><input {...num('expressDaysMax')} /></Field>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-700" checked={f.expressEnabled} onChange={(e) => setF({ ...f, expressEnabled: e.target.checked })} /><b>Activer l’Express</b> <span className="text-slate-500">— à activer une fois le volume stabilisé</span></label>
          </div>
          <div className="card p-5">
            <h3 className="font-bold">Parrainage, rentabilité & contact</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Récompense parrain"><input {...num('referralReward')} /></Field>
              <Field label="Bon de bienvenue filleul"><input {...num('referralWelcome')} /></Field>
              <Field label="Marge cible (%)"><input {...num('targetMarginPct')} /></Field>
              <Field label="Coûts fixes mensuels" hint="Équipe, outils, loyer, marketing de base"><input {...num('monthlyFixedCosts')} /></Field>
              <Field label="WhatsApp Business" hint="Format international"><input className="input" value={f.whatsappNumber} onChange={(e) => setF({ ...f, whatsappNumber: e.target.value })} placeholder="+242…" /></Field>
              <Field label="E-mail support"><input className="input" value={f.supportEmail} onChange={(e) => setF({ ...f, supportEmail: e.target.value })} /></Field>
              <Field label="Ville de lancement"><input className="input" value={f.launchCity} onChange={(e) => setF({ ...f, launchCity: e.target.value })} /></Field>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold">Équipe</h3><button className="btn-outline btn-sm" onClick={() => setMember({ id: uid('usr-'), name: '', email: '', phone: '', password: '', role: 'operations', city: settings.launchCity, referralCode: uid('STAFF-').slice(0, 10).toUpperCase(), credit: 0, createdAt: new Date().toISOString(), active: true })}><Plus size={14} />Membre</button></div>
            <div className="mt-3 divide-y divide-slate-100">
              {staff.map((u) => <div key={u.id} className="flex items-center justify-between py-2 text-sm"><div><b>{u.name}</b> <span className="text-slate-500">· {u.email}</span></div><div className="flex items-center gap-2"><Pill tone="violet">{{ admin: 'Admin', operations: 'Achats & logistique', support: 'Service client', client: '' }[u.role]}</Pill>{!u.active && <Pill>Inactif</Pill>}<button className="btn-ghost btn-sm" onClick={() => setMember(u)}><Pencil size={14} /></button></div></div>)}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="flex items-center gap-2 font-bold"><Calculator size={18} className="text-brand-700" />Simulateur de prix</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Prix fournisseur ($)"><input type="number" step="0.5" className="input" value={sim.usd} onChange={(e) => setSim({ ...sim, usd: Number(e.target.value) })} /></Field>
              <Field label="Poids (kg)"><input type="number" step="0.1" className="input" value={sim.w} onChange={(e) => setSim({ ...sim, w: Number(e.target.value) })} /></Field>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Produit</span><span>{money(parts.product)}</span></div>
              <div className="flex justify-between"><span>Transport</span><span>{money(parts.transport)}</span></div>
              <div className="flex justify-between"><span>Douane</span><span>{money(parts.customs)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>Frais de service</span><span>{money(margin)}</span></div>
              <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold"><span>Prix client</span><span className="text-brand-800">{money(price)}</span></div>
              <div className="text-xs text-slate-500">+ livraison {money(f.relayDeliveryFee)} (relais) ou {money(f.homeDeliveryFee)} (domicile)</div>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="flex items-center gap-2 font-bold"><Plug size={18} className="text-amber-600" />Intégrations à raccorder</h3>
            <div className="mt-3 space-y-2 text-sm">
              {[
                ['Paiement Mobile Money', 'Agrégateur (ex. CinetPay, MaxiCash, FlexPay) ou API opérateurs. Point d’accroche : écran de paiement + webhook de confirmation.'],
                ['WhatsApp Business API', 'Envoi automatique des notifications (actuellement simulé + bouton WhatsApp manuel).'],
                ['Passerelle SMS', 'Notifications SMS de secours.'],
                ['E-mail transactionnel', 'Confirmation et suivi par e-mail.'],
                ['API dropship (Option B)', 'Commande automatique chez CJ Dropshipping et autres.'],
              ].map(([t, d]) => <div key={t} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><b>{t}</b><Pill tone="amber">À raccorder</Pill></div><p className="mt-1 text-xs text-slate-500">{d}</p></div>)}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold">Journal d’activité</h3>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto text-xs">
              {audit.slice(0, 60).map((a) => <div key={a.id} className="flex gap-2"><span className="whitespace-nowrap text-slate-400">{fmtDateTime(a.at)}</span><span><b>{a.who}</b> — {a.action}</span></div>)}
            </div>
          </div>
          {me.role === 'admin' && (
            <div className="card border-rose-200 p-5">
              <h3 className="font-bold">Données de démonstration</h3>
              <p className="mt-1 text-xs text-slate-500">Remet la plateforme dans son état de présentation (commandes, clients, catalogue…).</p>
              <button className="btn-outline btn-sm mt-3 text-rose-600" onClick={() => setConfirmReset(true)}><RotateCcw size={14} />Réinitialiser la démo</button>
            </div>
          )}
        </div>
      </div>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Réinitialiser la démo ?">
        <p className="text-sm text-slate-600">Toutes les modifications faites pendant la démo seront effacées sur ce navigateur.</p>
        <div className="mt-4 flex gap-2"><button className="btn-danger flex-1" onClick={() => { resetDemo(); setF({ ...DEFAULT_SETTINGS }); setConfirmReset(false) }}>Réinitialiser</button><button className="btn-outline flex-1" onClick={() => setConfirmReset(false)}>Annuler</button></div>
      </Modal>
      <Modal open={!!member} onClose={() => setMember(null)} title="Membre de l’équipe">
        {member && (
          <div className="space-y-3">
            <Field label="Nom"><input className="input" value={member.name} onChange={(e) => setMember({ ...member, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail"><input className="input" value={member.email} onChange={(e) => setMember({ ...member, email: e.target.value })} /></Field>
              <Field label="Mot de passe"><input className="input" value={member.password} onChange={(e) => setMember({ ...member, password: e.target.value })} /></Field>
            </div>
            <Field label="Rôle"><select className="input" value={member.role} onChange={(e) => setMember({ ...member, role: e.target.value as User['role'] })}><option value="admin">Administrateur</option><option value="operations">Achats & logistique</option><option value="support">Service client</option></select></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-700" checked={member.active} onChange={(e) => setMember({ ...member, active: e.target.checked })} />Actif</label>
            <button className="btn-primary w-full" disabled={!member.name || !member.email || member.password.length < 6} onClick={() => { upsert('users', member); setMember(null) }}>Enregistrer</button>
          </div>
        )}
      </Modal>
    </div>
  )
}

