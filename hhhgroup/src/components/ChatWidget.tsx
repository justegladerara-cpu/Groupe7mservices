import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X, Headset } from 'lucide-react'
import { useStore } from '../lib/store'
import { waLink, fmtMoney } from '../lib/format'

type Msg = { from: 'bot' | 'me'; text: string; link?: { to: string; label: string } }

export const FAQ: { q: string; keys: string[]; a: string }[] = [
  { q: 'Comment payer sans carte bancaire ?', keys: ['payer', 'paiement', 'carte', 'mpesa', 'm-pesa', 'orange', 'airtel', 'mobile money'], a: 'Tu paies 100 % en Mobile Money (M-Pesa, Orange Money, Airtel Money). Pas besoin de carte Visa ou Mastercard : nous convertissons et payons le fournisseur pour toi.' },
  { q: 'Combien de temps pour recevoir ma commande ?', keys: ['délai', 'delai', 'temps', 'combien de jours', 'quand', 'recevoir', 'arrive'], a: 'Livraison Standard : 15 à 25 jours après le paiement. La date limite est affichée avant que tu valides et dans ton suivi.' },
  { q: 'Le prix affiché est-il vraiment final ?', keys: ['prix', 'frais', 'douane', 'cher', 'coût', 'cout', 'total', 'caché'], a: 'Oui. Le prix affiché comprend le produit, notre service, le transport international et la douane. Seule la livraison locale (domicile ou point relais) s’ajoute, et elle est affichée avant paiement. Aucun frais surprise.' },
  { q: 'Comment suivre mon colis ?', keys: ['suivi', 'suivre', 'où est', 'ou est', 'colis', 'statut'], a: 'Tu reçois une notification WhatsApp/SMS à chaque étape. Tu peux aussi suivre ta commande dans « Suivre un colis » avec ton numéro de commande et ton téléphone.' },
  { q: 'Puis-je commander un article qui n’est pas dans le catalogue ?', keys: ['lien', 'shein', 'aliexpress', 'pas dans', 'autre article', 'coller'], a: 'Oui ! Colle le lien du produit (SHEIN, AliExpress…) dans « Commander par lien ». Nous t’envoyons le prix tout compris, en général le jour même.' },
  { q: 'Où récupérer mon colis ?', keys: ['relais', 'récupérer', 'recuperer', 'domicile', 'livraison', 'adresse'], a: 'À domicile partout à Kinshasa, ou dans un de nos points relais (Gombe, Limete, Bandal, Ngaliema) — moins cher et pratique.' },
  { q: 'Et si l’article ne me convient pas ?', keys: ['retour', 'rembours', 'taille', 'abîmé', 'abime', 'cassé', 'casse', 'problème', 'probleme', 'réclamation', 'reclamation'], a: 'Si l’article est non conforme, endommagé ou manquant, ouvre une réclamation depuis ta commande dans les 7 jours : remboursement, avoir ou renvoi. Les changements d’avis ne sont pas remboursables une fois l’achat lancé.' },
  { q: 'C’est quoi le parrainage ?', keys: ['parrain', 'code', 'ami', 'réduction', 'reduction', 'promo'], a: 'Partage ton code : ton ami reçoit un bon de bienvenue et toi un crédit dès sa première commande payée. Ton code est dans « Mon compte > Parrainage ».' },
]

export default function ChatWidget() {
  const settings = useStore((s) => s.settings)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Bonjour 👋 Je suis l’assistant HHHGroup. Pose ta question ou choisis un sujet ci-dessous.' }])
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, open])

  const answer = (q: string) => {
    const t = q.toLowerCase()
    const best = FAQ.map((f) => ({ f, score: f.keys.filter((k) => t.includes(k)).length })).sort((a, b) => b.score - a.score)[0]
    let reply: Msg
    if (best && best.score > 0) {
      let a = best.f.a
      if (best.f.keys.includes('parrain')) a += ` (Bon ami : ${fmtMoney(settings.referralWelcome, settings.currencySymbol)} · Ta récompense : ${fmtMoney(settings.referralReward, settings.currencySymbol)})`
      reply = { from: 'bot', text: a }
    } else reply = { from: 'bot', text: 'Je n’ai pas la réponse exacte. Un conseiller peut t’aider directement sur WhatsApp.', link: { to: 'wa', label: 'Parler à un conseiller' } }
    setMsgs((m) => [...m, { from: 'me', text: q }, reply])
  }

  const wa = settings.whatsappNumber ? waLink(settings.whatsappNumber, 'Bonjour HHHGroup, j’ai une question :') : ''

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg hover:bg-brand-800 md:bottom-6" aria-label="Assistant">
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
      {open && (
        <div className="fixed bottom-36 right-4 z-40 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:bottom-24">
          <div className="bg-gradient-to-r from-brand-700 to-brand-900 px-4 py-3 text-white">
            <div className="font-semibold">Assistant HHHGroup</div>
            <div className="text-xs text-brand-100">Réponses instantanées · conseiller sur WhatsApp</div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.from === 'me' ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                  {m.text}
                  {m.link && (wa
                    ? <a href={wa} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 font-semibold text-emerald-700"><Headset size={14} />{m.link.label}</a>
                    : <div className="mt-2 text-xs text-slate-400">(Numéro WhatsApp Business à renseigner dans Paramètres)</div>)}
                </div>
              </div>
            ))}
            {msgs.length < 3 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {FAQ.slice(0, 6).map((f) => <button key={f.q} onClick={() => answer(f.q)} className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs text-brand-800 hover:bg-brand-50">{f.q}</button>)}
              </div>
            )}
            <div ref={end} />
          </div>
          <form className="flex gap-2 border-t border-slate-100 p-2" onSubmit={(e) => { e.preventDefault(); if (input.trim()) { answer(input.trim()); setInput('') } }}>
            <input className="input py-2" placeholder="Écris ta question…" value={input} onChange={(e) => setInput(e.target.value)} />
            <button className="btn-primary px-3" aria-label="Envoyer"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  )
}
