import { useEffect, useState } from 'react'

/** Compte à rebours jusqu'à minuit (fin de la vente flash du jour) */
export default function Countdown({ dark }: { dark?: boolean }) {
  const calc = () => {
    const now = new Date()
    const end = new Date(now); end.setHours(24, 0, 0, 0)
    return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
  }
  const [left, setLeft] = useState(calc)
  useEffect(() => { const t = setInterval(() => setLeft(calc()), 1000); return () => clearInterval(t) }, [])
  const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, '0'))
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums" aria-label="Temps restant">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className={`rounded-md px-1.5 py-0.5 ${dark ? 'bg-slate-900 text-white' : 'bg-white text-rose-600'}`}>{p}</span>
          {i < 2 && <span className={dark ? 'text-slate-900' : 'text-white'}>:</span>}
        </span>
      ))}
    </span>
  )
}
