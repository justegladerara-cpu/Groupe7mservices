import type { ReactElement } from 'react'

const G: Record<string, ReactElement> = {
  dress: <path d="M40 18h20l-3 12 13 46H30l13-46z M43 18c2 5 12 5 14 0" />,
  tshirt: <path d="M36 22l-16 10 6 12 8-4v38h32V40l8 4 6-12-16-10c-2 6-8 9-14 9s-12-3-14-9z" />,
  shirt: <path d="M38 20l-16 9 5 14 7-3v40h32V40l7 3 5-14-16-9-6 8h-12z M50 28v50" />,
  jeans: <path d="M32 18h36l4 62H56l-6-40-6 40H28z M32 26h36" />,
  heels: <path d="M18 66c8-2 18-12 26-26 4-6 10-8 14-4l8 30H48c-6 0-10-2-14-2s-8 4-16 4z M66 66l6 16h-4l-6-16" />,
  sneaker: <path d="M16 70V52c8 0 14-4 18-12l6 4c4 6 10 8 18 8 14 0 26 6 26 18z M16 70h68v6H16z M40 50l4-4 M46 54l4-4 M52 56l4-4" />,
  bag: <path d="M24 38h52l-4 42H28z M38 38v-6a12 12 0 0124 0v6" />,
  clutch: <path d="M18 40h64v32H18z M18 40l32 18 32-18 M46 56h8v6h-8z" />,
  lipstick: <path d="M42 46h16v34H42z M44 46V30l12-8v24 M38 80h24" />,
  perfume: <path d="M30 40h40v40H30z M42 28h16v12H42z M46 20h8v8h-8z M38 52h24" />,
  skincare: <path d="M34 34h32v46H34z M38 22h24v12H38z M40 50h20 M40 58h14" />,
  watch: <path d="M42 14h16l2 18H40z M42 86h16l2-18H40z M50 30a20 20 0 110 40 20 20 0 010-40z M50 40v10l8 6" />,
  necklace: <path d="M22 20c0 30 12 46 28 46s28-16 28-46 M50 66l-8 10 8 10 8-10z" />,
  earrings: <path d="M32 18v14 M68 18v14 M32 32l-8 18 8 18 8-18z M68 32l-8 18 8 18 8-18z" />,
  sunglasses: <path d="M12 42h76 M16 42c0 14 6 20 16 20s14-6 14-20 M54 42c0 14 4 20 14 20s16-6 16-20" />,
  cap: <path d="M20 58c0-20 14-32 30-32s30 12 30 32z M20 58h64c4 0 6 6 0 8H20z M50 26v-4" />,
  headphones: <path d="M22 60V50a28 28 0 0156 0v10 M18 58h12v22H18z M70 58h12v22H70z" />,
  phone: <path d="M34 14h32v72H34z M44 20h12 M48 78h4" />,
  watchsmart: <path d="M40 16h20v14H40z M40 70h20v14H40z M34 30h32v40H34z M42 50l5 5 10-10" />,
  lamp: <path d="M34 22h32l8 26H26z M50 48v28 M36 80h28" />,
  cushion: <path d="M20 26c10 4 50 4 60 0-4 10-4 38 0 48-10-4-50-4-60 0 4-10 4-38 0-48z" />,
  wallet: <path d="M18 32h58v40H18z M60 46h22v14H60z M18 32l44-12 6 12" />,
  hair: <path d="M30 30c0-14 40-14 40 0v40c0 8-4 12-6 12V40c0-6-28-6-28 0v42c-2 0-6-4-6-12z" />,
}

export const GLYPHS = Object.keys(G)

export default function ProductVisual({ glyph, hue, image, className = '' }: { glyph: string; hue: number; image?: string; className?: string }) {
  if (image) return <img src={image} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />
  const c1 = `hsl(${hue} 85% 92%)`
  const c2 = `hsl(${(hue + 40) % 360} 80% 82%)`
  const stroke = `hsl(${hue} 55% 32%)`
  const id = `g${hue}${glyph}`
  return (
    <svg viewBox="0 0 100 100" className={`h-full w-full ${className}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      <circle cx="78" cy="22" r="30" fill="#fff" opacity="0.25" />
      <g fill={`hsl(${hue} 70% 97%)`} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" transform="translate(10 8) scale(0.8)">
        {G[glyph] ?? G.bag}
      </g>
    </svg>
  )
}
