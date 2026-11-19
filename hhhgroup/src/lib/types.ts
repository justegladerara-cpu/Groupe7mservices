export type Role = 'client' | 'admin' | 'operations' | 'support'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  password: string
  role: Role
  city: string
  commune?: string
  address?: string
  referralCode: string
  referredBy?: string
  credit: number // crédit parrainage en devise locale
  createdAt: string
  active: boolean
}

export type Category = 'Mode femme' | 'Mode homme' | 'Chaussures' | 'Sacs & accessoires' | 'Beauté' | 'Bijoux & montres' | 'Tech & gadgets' | 'Maison'

export interface Product {
  id: string
  name: string
  category: Category
  supplierId: string
  supplierUrl?: string
  supplierPriceUsd: number
  weightKg: number
  image: string // URL ou data URI
  glyph: string
  hue: number
  sizes: string[]
  colors: string[]
  description: string
  tags: string[]
  active: boolean
  featured: boolean
  promoPct: number // remise vente flash (0 = aucune)
  isNew: boolean
  sold: number // nombre d'exemplaires vendus (preuve sociale)
  createdAt: string
}

export type DeliveryMode = 'domicile' | 'relais' | 'express'

export type OrderStatus =
  | 'attente_paiement'
  | 'paiement_confirme'
  | 'achat_fournisseur'
  | 'en_transit'
  | 'dedouanement'
  | 'en_livraison'
  | 'livree'
  | 'annulee'

export interface OrderItem {
  productId?: string
  linkRequestId?: string
  name: string
  image: string
  glyph: string
  hue: number
  size?: string
  color?: string
  qty: number
  supplierId: string
  supplierUrl?: string
  supplierPriceUsd: number
  weightKg: number
  unitPrice: number // prix tout compris unitaire (devise locale)
}

export interface PriceBreakdown {
  productCost: number
  serviceFee: number
  transport: number
  customs: number
  delivery: number
  discount: number // crédit parrainage / avoir
  promo: number // code promo
  total: number
}

export interface StatusEvent {
  status: OrderStatus
  at: string
  by: string
  note?: string
}

export interface Order {
  id: string
  number: string
  customerId: string
  items: OrderItem[]
  delivery: DeliveryMode
  relayPointId?: string
  commune?: string
  address?: string
  phone: string
  paymentOperator: string
  promoCode?: string
  paymentRef?: string
  paidAt?: string
  breakdown: PriceBreakdown
  total: number
  status: OrderStatus
  history: StatusEvent[]
  purchaseBatchId?: string
  shipmentId?: string
  courierId?: string
  promisedDate: string
  deliveredAt?: string
  // coûts réels (devise locale) saisis par l'équipe
  realCosts: { product?: number; transport?: number; customs?: number; delivery?: number }
  internalNotes: string
  createdAt: string
}

export interface LinkRequest {
  id: string
  number: string
  customerId: string
  url: string
  supplierId: string
  title: string
  size?: string
  color?: string
  qty: number
  clientNote?: string
  status: 'nouvelle' | 'chiffree' | 'acceptee' | 'refusee' | 'expiree'
  supplierPriceUsd?: number
  weightKg?: number
  quotedUnitPrice?: number
  adminNote?: string
  orderId?: string
  createdAt: string
  quotedAt?: string
}

export interface Supplier {
  id: string
  name: string
  kind: 'catalogue' | 'dropship_api' | 'grossiste'
  website: string
  domains: string[]
  apiAvailable: boolean
  notes: string
  active: boolean
}

export interface PurchaseBatch {
  id: string
  number: string
  supplierId: string
  orderIds: string[]
  supplierOrderRef: string
  amountUsd: number
  buyer: string
  createdAt: string
  status: 'commandee' | 'recue_entrepot'
}

export interface Shipment {
  id: string
  number: string
  forwarderId: string
  trackingNumber: string
  orderIds: string[]
  weightKg: number
  transportCost: number
  customsCost: number
  insured: boolean
  status: 'preparation' | 'en_transit' | 'arrivee' | 'dedouanee'
  departedAt?: string
  eta?: string
  arrivedAt?: string
  clearedAt?: string
  createdAt: string
}

export interface Forwarder { id: string; name: string; contact: string; phone: string; route: string; ratePerKgUsd: number; avgDays: number; active: boolean; notes: string }
export interface Courier { id: string; name: string; phone: string; zone: string; vehicle: string; active: boolean }
export interface RelayPoint { id: string; name: string; commune: string; address: string; hours: string; phone: string; active: boolean }
export interface PaymentOperator { id: string; name: string; short: string; color: string; active: boolean; merchantCode: string }

export type Channel = 'whatsapp' | 'sms' | 'email' | 'app'

export interface Notification {
  id: string
  customerId: string
  orderId?: string
  channels: Channel[]
  title: string
  body: string
  at: string
  read: boolean
  deliveryStatus: 'simule' | 'envoye' | 'echec'
}

export interface Review {
  id: string
  customerId: string
  orderId: string
  productId?: string
  rating: number
  comment: string
  at: string
  status: 'en_attente' | 'publie' | 'masque'
}

export interface ClaimMessage { at: string; from: 'client' | 'equipe'; author: string; text: string }
export interface Claim {
  id: string
  number: string
  orderId: string
  customerId: string
  reason: 'retard' | 'non_conforme' | 'endommage' | 'manquant' | 'autre'
  description: string
  status: 'ouverte' | 'en_cours' | 'resolue' | 'rejetee'
  resolution?: 'remboursement' | 'avoir' | 'renvoi' | 'aucune'
  refundAmount?: number
  messages: ClaimMessage[]
  createdAt: string
  closedAt?: string
}

export interface Risk { id: string; title: string; impact: 'Élevé' | 'Moyen' | 'Faible'; probability: 'Élevée' | 'Moyenne' | 'Faible'; mitigation: string; owner: string; status: 'ouvert' | 'maitrise' | 'clos'; lastReview: string }
export interface RoadmapTask { id: string; phase: string; title: string; done: boolean }
export interface City { id: string; name: string; country: string; status: 'active' | 'pilote' | 'planifiee'; condition: string }

export interface Settings {
  brandName: string
  currency: string
  currencySymbol: string
  fxRate: number // unités locales pour 1 USD
  serviceFeePct: number
  transportPerKgUsd: number
  minWeightKg: number
  customsPct: number
  homeDeliveryFee: number
  relayDeliveryFee: number
  expressEnabled: boolean
  expressSurchargePct: number
  standardDaysMin: number
  standardDaysMax: number
  expressDaysMin: number
  expressDaysMax: number
  roundTo: number
  referralReward: number
  referralWelcome: number
  monthlyFixedCosts: number
  targetMarginPct: number
  whatsappNumber: string
  supportEmail: string
  launchCity: string
  quoteValidityDays: number
  paymentsLive: boolean
  freeRelayThreshold: number // livraison point relais offerte dès ce montant d'articles
  flashSaleTitle: string
}

export interface PromoCode { id: string; code: string; pct: number; minAmount: number; description: string; active: boolean; uses: number }

export interface Template { id: OrderStatus | 'devis_pret' | 'reclamation_maj' | 'bienvenue'; title: string; body: string; channels: Channel[] }

export interface AuditEntry { id: string; at: string; who: string; action: string }
