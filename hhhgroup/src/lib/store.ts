import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { SeedData } from './seed'
import { buildSeed } from './seed'
import type {
  Channel, Claim, DeliveryMode, LinkRequest, Order, OrderItem, OrderStatus, Review, Settings, User, Template,
} from './types'
import { allInclusiveUnitPrice, computeBreakdown, deliveryWindow, promisedDate, productPrice } from './pricing'
import { STATUS_FLOW, STATUS_LABEL, CLAIM_STATUS } from './constants'
import { fmtMoney, fmtDate, uid } from './format'

export interface CartLine { key: string; productId?: string; linkRequestId?: string; size?: string; color?: string; qty: number }

type Collections = 'promoCodes' | 'products' | 'suppliers' | 'forwarders' | 'couriers' | 'relayPoints' | 'operators' | 'risks' | 'cities' | 'users' | 'templates'

interface State extends SeedData {
  currentUserId: string | null
  cart: CartLine[]
  wishlist: string[]
  recent: string[]
  toggleWishlist: (productId: string) => void
  addRecent: (productId: string) => void
  checkPromo: (code: string, itemsTotal: number) => { ok: boolean; pct: number; message: string }
  // auth
  login: (email: string, password: string) => User | null
  logout: () => void
  register: (d: { name: string; email: string; phone: string; password: string; commune?: string; referral?: string }) => { ok: boolean; error?: string }
  updateProfile: (patch: Partial<User>) => void
  // panier
  addToCart: (l: Omit<CartLine, 'key'>) => void
  setCartQty: (key: string, qty: number) => void
  removeFromCart: (key: string) => void
  clearCart: () => void
  cartItems: () => OrderItem[]
  // commandes
  placeOrder: (d: { delivery: DeliveryMode; relayPointId?: string; commune?: string; address?: string; phone: string; operator: string; useCredit: boolean; promoCode?: string }) => Order
  simulatePayment: (orderId: string, by?: string) => void
  setStatus: (orderId: string, status: OrderStatus, by: string, note?: string) => void
  updateOrder: (orderId: string, patch: Partial<Order>) => void
  createBatch: (d: { supplierId: string; orderIds: string[]; supplierOrderRef: string; amountUsd: number; buyer: string }) => void
  createShipment: (d: { orderIds: string[]; forwarderId: string; trackingNumber: string; transportCost: number; insured: boolean; eta: string; by: string }) => void
  shipmentArrived: (id: string, customsCost: number, by: string) => void
  dispatchOrder: (orderId: string, courierId: string | undefined, by: string) => void
  markDelivered: (orderId: string, deliveryCost: number, by: string, note?: string) => void
  // liens
  submitLink: (d: { url: string; title: string; size?: string; color?: string; qty: number; clientNote?: string }) => LinkRequest
  quoteLink: (id: string, usd: number, weightKg: number, adminNote: string, by: string) => void
  respondLink: (id: string, accept: boolean) => void
  // avis / réclamations
  addReview: (d: { orderId: string; productId?: string; rating: number; comment: string }) => void
  moderateReview: (id: string, status: Review['status']) => void
  openClaim: (d: { orderId: string; reason: Claim['reason']; description: string }) => Claim
  replyClaim: (id: string, from: 'client' | 'equipe', author: string, text: string) => void
  updateClaim: (id: string, patch: Partial<Claim>, by: string) => void
  // notifications
  notify: (customerId: string, templateId: Template['id'], vars: Record<string, string>, orderId?: string) => void
  markNotificationsRead: (customerId: string) => void
  // générique
  upsert: <K extends Collections>(col: K, item: SeedData[K][number]) => void
  remove: (col: Collections, id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  toggleRoadmap: (id: string) => void
  log: (who: string, action: string) => void
  resetDemo: () => void
}

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)

const nextNumber = (prefix: string, existing: string[], start = 1000) => {
  const max = existing.reduce((m, n) => Math.max(m, parseInt(n.replace(/\D/g, ''), 10) || 0), start)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

export const baseStore = create<State>()(
  persist(
    (set, get) => {
      const orderVars = (o: Order): Record<string, string> => {
        const s = get().settings
        const u = get().users.find((x) => x.id === o.customerId)
        const sh = get().shipments.find((x) => x.id === o.shipmentId)
        const rp = get().relayPoints.find((x) => x.id === o.relayPointId)
        return {
          prenom: u?.name.split(' ')[0] ?? '', numero: o.number, total: fmtMoney(o.total, s.currencySymbol), marque: s.brandName,
          date_promise: fmtDate(o.promisedDate), suivi: sh?.trackingNumber ?? o.number,
          mode_livraison: o.delivery === 'relais' ? `retrait au ${rp?.name ?? 'point relais'}` : 'livraison à domicile',
        }
      }
      const pushStatus = (o: Order, status: OrderStatus, by: string, note?: string): Order => ({
        ...o, status, history: [...o.history, { status, at: new Date().toISOString(), by, note }],
      })
      const notifyOrder = (o: Order) => get().notify(o.customerId, o.status, orderVars(o), o.id)
      const patchOrders = (ids: string[], fn: (o: Order) => Order) =>
        set((st) => ({ orders: st.orders.map((o) => (ids.includes(o.id) ? fn(o) : o)) }))

      return {
        ...buildSeed(),
        currentUserId: null,
        cart: [],
        wishlist: [],
        recent: [],
        toggleWishlist: (id) => set((st) => ({ wishlist: st.wishlist.includes(id) ? st.wishlist.filter((x) => x !== id) : [id, ...st.wishlist] })),
        addRecent: (id) => set((st) => (st.recent[0] === id ? {} : { recent: [id, ...st.recent.filter((x) => x !== id)].slice(0, 12) })),
        checkPromo: (code, itemsTotal) => {
          const st = get()
          const pc = st.promoCodes.find((x) => x.code.toLowerCase() === code.trim().toLowerCase())
          if (!pc || !pc.active) return { ok: false, pct: 0, message: 'Code promo inconnu ou expiré.' }
          if (itemsTotal < pc.minAmount) return { ok: false, pct: 0, message: `Ce code s’applique dès ${fmtMoney(pc.minAmount, st.settings.currencySymbol)} d’articles.` }
          return { ok: true, pct: pc.pct, message: `${pc.code} appliqué : -${pc.pct} %` }
        },

        login: (email, password) => {
          const u = get().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password && x.active)
          if (u) set({ currentUserId: u.id })
          return u ?? null
        },
        logout: () => set({ currentUserId: null }),
        register: (d) => {
          const st = get()
          if (st.users.some((u) => u.email.toLowerCase() === d.email.toLowerCase())) return { ok: false, error: 'Un compte existe déjà avec cet e-mail.' }
          const sponsor = d.referral ? st.users.find((u) => u.referralCode.toLowerCase() === d.referral!.trim().toLowerCase()) : undefined
          if (d.referral && !sponsor) return { ok: false, error: 'Code parrainage inconnu.' }
          const code = d.name.split(' ')[0].toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '').slice(0, 6) + Math.floor(10 + Math.random() * 89)
          const u: User = {
            id: uid('usr-'), name: d.name, email: d.email.trim(), phone: d.phone, password: d.password, role: 'client', city: st.settings.launchCity,
            commune: d.commune, referralCode: code, referredBy: sponsor?.referralCode, credit: sponsor ? st.settings.referralWelcome : 0,
            createdAt: new Date().toISOString(), active: true,
          }
          set({ users: [...st.users, u], currentUserId: u.id })
          get().notify(u.id, 'bienvenue', { prenom: d.name.split(' ')[0], marque: st.settings.brandName, code })
          return { ok: true }
        },
        updateProfile: (patch) => set((st) => ({ users: st.users.map((u) => (u.id === st.currentUserId ? { ...u, ...patch } : u)) })),

        addToCart: (l) => set((st) => {
          const key = `${l.productId ?? l.linkRequestId}|${l.size ?? ''}|${l.color ?? ''}`
          const ex = st.cart.find((c) => c.key === key)
          if (ex) return { cart: st.cart.map((c) => (c.key === key ? { ...c, qty: c.qty + l.qty } : c)) }
          return { cart: [...st.cart, { ...l, key }] }
        }),
        setCartQty: (key, qty) => set((st) => ({ cart: st.cart.map((c) => (c.key === key ? { ...c, qty: Math.max(1, Math.min(10, qty)) } : c)) })),
        removeFromCart: (key) => set((st) => ({ cart: st.cart.filter((c) => c.key !== key) })),
        clearCart: () => set({ cart: [] }),
        cartItems: () => {
          const st = get()
          return st.cart.flatMap((c): OrderItem[] => {
            if (c.productId) {
              const p = st.products.find((x) => x.id === c.productId)
              if (!p) return []
              return [{ productId: p.id, name: p.name, image: p.image, glyph: p.glyph, hue: p.hue, size: c.size, color: c.color, qty: c.qty, supplierId: p.supplierId, supplierUrl: p.supplierUrl, supplierPriceUsd: p.supplierPriceUsd, weightKg: p.weightKg, unitPrice: productPrice(p, st.settings) }]
            }
            const l = st.linkRequests.find((x) => x.id === c.linkRequestId)
            if (!l || !l.supplierPriceUsd) return []
            return [{ linkRequestId: l.id, name: l.title, image: '', glyph: 'bag', hue: 260, size: l.size, color: l.color, qty: c.qty, supplierId: l.supplierId, supplierUrl: l.url, supplierPriceUsd: l.supplierPriceUsd, weightKg: l.weightKg ?? 0.5, unitPrice: l.quotedUnitPrice ?? allInclusiveUnitPrice(l.supplierPriceUsd, l.weightKg ?? 0.5, st.settings) }]
          })
        },

        placeOrder: (d) => {
          const st = get()
          const u = st.users.find((x) => x.id === st.currentUserId)!
          const items = st.cartItems()
          const itemsTotal = items.reduce((a, i) => a + i.unitPrice * i.qty, 0)
          const promo = d.promoCode ? st.checkPromo(d.promoCode, itemsTotal) : null
          const breakdown = computeBreakdown(items, d.delivery, st.settings, d.useCredit ? u.credit : 0, promo?.ok ? promo.pct : 0)
          const now = new Date()
          const o: Order = {
            id: uid('ord-'), number: nextNumber('HHH', st.orders.map((x) => x.number)), customerId: u.id, items, delivery: d.delivery,
            relayPointId: d.relayPointId, commune: d.commune, address: d.address, phone: d.phone, paymentOperator: d.operator,
            promoCode: promo?.ok ? d.promoCode!.trim().toUpperCase() : undefined,
            breakdown, total: breakdown.total, status: 'attente_paiement',
            history: [{ status: 'attente_paiement', at: now.toISOString(), by: 'Système' }],
            promisedDate: promisedDate(now, d.delivery, st.settings), realCosts: {}, internalNotes: '', createdAt: now.toISOString(),
          }
          const linkIds = items.map((i) => i.linkRequestId).filter(Boolean) as string[]
          set({
            orders: [o, ...st.orders], cart: [],
            promoCodes: st.promoCodes.map((x) => (o.promoCode && x.code === o.promoCode ? { ...x, uses: x.uses + 1 } : x)),
            products: st.products.map((p) => { const q = items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.qty, 0); return q ? { ...p, sold: p.sold + q } : p }),
            users: st.users.map((x) => (x.id === u.id ? { ...x, credit: x.credit - breakdown.discount, phone: x.phone || d.phone } : x)),
            linkRequests: st.linkRequests.map((l) => (linkIds.includes(l.id) ? { ...l, status: 'acceptee', orderId: o.id } : l)),
          })
          notifyOrder(o)
          get().log(u.name, `Commande ${o.number} créée (${fmtMoney(o.total, st.settings.currencySymbol)})`)
          return o
        },
        simulatePayment: (orderId, by = 'Système (paiement simulé)') => {
          const st = get()
          const o = st.orders.find((x) => x.id === orderId)
          if (!o || o.status !== 'attente_paiement') return
          const paid = { ...pushStatus(o, 'paiement_confirme', by), paidAt: new Date().toISOString(), paymentRef: `SIM${Math.floor(100000000 + Math.random() * 899999999)}`, promisedDate: promisedDate(new Date(), o.delivery, st.settings) }
          set({ orders: st.orders.map((x) => (x.id === orderId ? paid : x)) })
          // Récompense parrain à la 1re commande payée du filleul
          const u = st.users.find((x) => x.id === o.customerId)
          const firstPaid = !st.orders.some((x) => x.customerId === o.customerId && x.id !== o.id && x.paidAt)
          if (u?.referredBy && firstPaid) {
            set((s2) => ({ users: s2.users.map((x) => (x.referralCode === u.referredBy ? { ...x, credit: x.credit + st.settings.referralReward } : x)) }))
          }
          notifyOrder(paid)
          get().log(by, `Paiement confirmé pour ${o.number}`)
        },
        setStatus: (orderId, status, by, note) => {
          const o = get().orders.find((x) => x.id === orderId)
          if (!o) return
          const next = { ...pushStatus(o, status, by, note), ...(status === 'livree' ? { deliveredAt: new Date().toISOString() } : {}) }
          set((st) => ({ orders: st.orders.map((x) => (x.id === orderId ? next : x)) }))
          notifyOrder(next)
          get().log(by, `${o.number} → ${STATUS_LABEL[status]}${note ? ` (${note})` : ''}`)
        },
        updateOrder: (orderId, patch) => set((st) => ({ orders: st.orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o)) })),

        createBatch: (d) => {
          const st = get()
          const b = { id: uid('bat-'), number: nextNumber('ACH', st.batches.map((x) => x.number), 0), ...d, createdAt: new Date().toISOString(), status: 'commandee' as const }
          const fx = st.settings.fxRate
          const ordersIn = st.orders.filter((o) => d.orderIds.includes(o.id))
          const estUsd = ordersIn.reduce((s, o) => s + o.items.reduce((a, i) => a + i.supplierPriceUsd * i.qty, 0), 0) || 1
          set({ batches: [b, ...st.batches] })
          patchOrders(d.orderIds, (o) => {
            const share = o.items.reduce((a, i) => a + i.supplierPriceUsd * i.qty, 0) / estUsd
            return { ...pushStatus(o, 'achat_fournisseur', d.buyer, `Lot ${b.number} — réf. fournisseur ${d.supplierOrderRef}`), purchaseBatchId: b.id, realCosts: { ...o.realCosts, product: Math.round(d.amountUsd * share * fx) } }
          })
          get().orders.filter((o) => d.orderIds.includes(o.id)).forEach(notifyOrder)
          get().log(d.buyer, `Lot d’achat ${b.number} créé (${d.orderIds.length} commandes)`)
        },
        createShipment: (d) => {
          const st = get()
          const ordersIn = st.orders.filter((o) => d.orderIds.includes(o.id))
          const w = (o: Order) => o.items.reduce((a, i) => a + Math.max(i.weightKg, st.settings.minWeightKg) * i.qty, 0)
          const totalW = ordersIn.reduce((s, o) => s + w(o), 0) || 1
          const sh = {
            id: uid('shp-'), number: nextNumber('EXP', st.shipments.map((x) => x.number), 0), forwarderId: d.forwarderId, trackingNumber: d.trackingNumber,
            orderIds: d.orderIds, weightKg: Math.round(totalW * 10) / 10, transportCost: d.transportCost, customsCost: 0, insured: d.insured,
            status: 'en_transit' as const, departedAt: new Date().toISOString(), eta: d.eta, createdAt: new Date().toISOString(),
          }
          set({ shipments: [sh, ...st.shipments], batches: st.batches.map((b) => (b.orderIds.some((id) => d.orderIds.includes(id)) ? { ...b, status: 'recue_entrepot' } : b)) })
          patchOrders(d.orderIds, (o) => ({ ...pushStatus(o, 'en_transit', d.by, `Expédition ${sh.number} — suivi ${d.trackingNumber}`), shipmentId: sh.id, realCosts: { ...o.realCosts, transport: Math.round(d.transportCost * (w(o) / totalW)) } }))
          get().orders.filter((o) => d.orderIds.includes(o.id)).forEach(notifyOrder)
          get().log(d.by, `Expédition ${sh.number} partie (${d.orderIds.length} commandes)`)
        },
        shipmentArrived: (id, customsCost, by) => {
          const st = get()
          const sh = st.shipments.find((x) => x.id === id)!
          const ordersIn = st.orders.filter((o) => sh.orderIds.includes(o.id) && o.status === 'en_transit')
          const val = (o: Order) => o.breakdown.productCost || 1
          const totalV = ordersIn.reduce((s, o) => s + val(o), 0) || 1
          set({ shipments: st.shipments.map((x) => (x.id === id ? { ...x, status: 'dedouanee', customsCost, arrivedAt: new Date().toISOString(), clearedAt: new Date().toISOString() } : x)) })
          patchOrders(ordersIn.map((o) => o.id), (o) => ({ ...pushStatus(o, 'dedouanement', by, `Arrivée expédition ${sh.number}`), realCosts: { ...o.realCosts, customs: Math.round(customsCost * (val(o) / totalV)) } }))
          get().orders.filter((o) => ordersIn.some((x) => x.id === o.id)).forEach(notifyOrder)
          get().log(by, `Expédition ${sh.number} arrivée et dédouanée`)
        },
        dispatchOrder: (orderId, courierId, by) => {
          const o = get().orders.find((x) => x.id === orderId)!
          const c = get().couriers.find((x) => x.id === courierId)
          const next = { ...pushStatus(o, 'en_livraison', by, o.delivery === 'relais' ? 'Déposé au point relais' : `Confié à ${c?.name ?? 'livreur'}`), courierId }
          set((st) => ({ orders: st.orders.map((x) => (x.id === orderId ? next : x)) }))
          notifyOrder(next)
          get().log(by, `${o.number} en livraison`)
        },
        markDelivered: (orderId, deliveryCost, by, note) => {
          const o = get().orders.find((x) => x.id === orderId)!
          const next = { ...pushStatus(o, 'livree', by, note), deliveredAt: new Date().toISOString(), realCosts: { ...o.realCosts, delivery: deliveryCost } }
          set((st) => ({ orders: st.orders.map((x) => (x.id === orderId ? next : x)) }))
          notifyOrder(next)
          get().log(by, `${o.number} livrée`)
        },

        submitLink: (d) => {
          const st = get()
          const sup = st.suppliers.find((s) => s.domains.some((dom) => d.url.toLowerCase().includes(dom))) ?? st.suppliers[0]
          const l: LinkRequest = { id: uid('lnk-'), number: nextNumber('DEV', st.linkRequests.map((x) => x.number), 200), customerId: st.currentUserId!, supplierId: sup.id, status: 'nouvelle', createdAt: new Date().toISOString(), ...d }
          set({ linkRequests: [l, ...st.linkRequests] })
          get().log('Client', `Demande par lien ${l.number} reçue`)
          return l
        },
        quoteLink: (id, usd, weightKg, adminNote, by) => {
          const st = get()
          const price = allInclusiveUnitPrice(usd, weightKg, st.settings)
          const l = st.linkRequests.find((x) => x.id === id)!
          set({ linkRequests: st.linkRequests.map((x) => (x.id === id ? { ...x, status: 'chiffree', supplierPriceUsd: usd, weightKg, quotedUnitPrice: price, adminNote, quotedAt: new Date().toISOString() } : x)) })
          get().notify(l.customerId, 'devis_pret', { prenom: st.users.find((u) => u.id === l.customerId)?.name.split(' ')[0] ?? '', numero: l.number, total: fmtMoney(price * l.qty, st.settings.currencySymbol), validite: String(st.settings.quoteValidityDays) })
          get().log(by, `Devis ${l.number} chiffré`)
        },
        respondLink: (id, accept) => {
          const l = get().linkRequests.find((x) => x.id === id)!
          if (accept) get().addToCart({ linkRequestId: id, size: l.size, color: l.color, qty: l.qty })
          else set((st) => ({ linkRequests: st.linkRequests.map((x) => (x.id === id ? { ...x, status: 'refusee' } : x)) }))
        },

        addReview: (d) => set((st) => ({ reviews: [{ id: uid('rev-'), customerId: st.currentUserId!, at: new Date().toISOString(), status: 'en_attente', ...d }, ...st.reviews] })),
        moderateReview: (id, status) => set((st) => ({ reviews: st.reviews.map((r) => (r.id === id ? { ...r, status } : r)) })),
        openClaim: (d) => {
          const st = get()
          const o = st.orders.find((x) => x.id === d.orderId)!
          const u = st.users.find((x) => x.id === o.customerId)!
          const c: Claim = { id: uid('clm-'), number: nextNumber('REC', st.claims.map((x) => x.number), 30), customerId: o.customerId, status: 'ouverte', createdAt: new Date().toISOString(), messages: [{ at: new Date().toISOString(), from: 'client', author: u.name, text: d.description }], ...d }
          set({ claims: [c, ...st.claims] })
          get().log(u.name, `Réclamation ${c.number} ouverte`)
          return c
        },
        replyClaim: (id, from, author, text) => {
          set((st) => ({ claims: st.claims.map((c) => (c.id === id ? { ...c, status: from === 'equipe' && c.status === 'ouverte' ? 'en_cours' : c.status, messages: [...c.messages, { at: new Date().toISOString(), from, author, text }] } : c)) }))
          if (from === 'equipe') {
            const c = get().claims.find((x) => x.id === id)!
            const u = get().users.find((x) => x.id === c.customerId)
            get().notify(c.customerId, 'reclamation_maj', { prenom: u?.name.split(' ')[0] ?? '', numero: c.number, statut: 'nouvelle réponse de l’équipe' })
          }
        },
        updateClaim: (id, patch, by) => {
          set((st) => ({ claims: st.claims.map((c) => (c.id === id ? { ...c, ...patch, closedAt: patch.status === 'resolue' || patch.status === 'rejetee' ? new Date().toISOString() : c.closedAt } : c)) }))
          const c = get().claims.find((x) => x.id === id)!
          if (patch.resolution === 'avoir' && patch.refundAmount) set((st) => ({ users: st.users.map((u) => (u.id === c.customerId ? { ...u, credit: u.credit + patch.refundAmount! } : u)) }))
          if (patch.status) {
            const u = get().users.find((x) => x.id === c.customerId)
            get().notify(c.customerId, 'reclamation_maj', { prenom: u?.name.split(' ')[0] ?? '', numero: c.number, statut: CLAIM_STATUS[patch.status] })
          }
          get().log(by, `Réclamation ${c.number} mise à jour`)
        },

        notify: (customerId, templateId, vars, orderId) => {
          const st = get()
          const t = st.templates.find((x) => x.id === templateId)
          if (!t) return
          const v = { marque: st.settings.brandName, ...vars }
          const n = { id: uid('ntf-'), customerId, orderId, channels: t.channels as Channel[], title: fill(t.title, v), body: fill(t.body, v), at: new Date().toISOString(), read: false, deliveryStatus: 'simule' as const }
          set({ notifications: [n, ...st.notifications] })
        },
        markNotificationsRead: (customerId) => set((st) => ({ notifications: st.notifications.map((n) => (n.customerId === customerId ? { ...n, read: true } : n)) })),

        upsert: (col, item) => set((st) => {
          const arr = st[col] as { id: string }[]
          const it = item as { id: string }
          const exists = arr.some((x) => x.id === it.id)
          return { [col]: exists ? arr.map((x) => (x.id === it.id ? it : x)) : [it, ...arr] } as Partial<State>
        }),
        remove: (col, id) => set((st) => ({ [col]: (st[col] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<State>),
        updateSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),
        toggleRoadmap: (id) => set((st) => ({ roadmap: st.roadmap.map((r) => (r.id === id ? { ...r, done: !r.done } : r)) })),
        log: (who, action) => set((st) => ({ audit: [{ id: uid('aud-'), at: new Date().toISOString(), who, action }, ...st.audit].slice(0, 500) })),
        resetDemo: () => set({ ...buildSeed(), cart: [], wishlist: [], recent: [] }),
      }
    },
    {
      name: 'hhhgroup-demo-cg-v2',
      storage: createJSONStorage(() => {
        try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage } catch {
          const m = new Map<string, string>()
          return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
        }
      }),
    },
  ),
)

/** Sélecteur avec comparaison superficielle (évite les re-rendus en boucle sur filter/map) */
export function useStore<T>(selector: (s: State) => T): T {
  return baseStore(useShallow(selector))
}

export const useCurrentUser = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null)
export const isStaff = (u: User | null) => !!u && u.role !== 'client'
export { STATUS_FLOW, deliveryWindow }
