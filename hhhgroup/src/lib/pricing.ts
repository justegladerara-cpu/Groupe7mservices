import type { DeliveryMode, Order, OrderItem, PriceBreakdown, Settings } from './types'

const roundUp = (v: number, step: number) => (step > 0 ? Math.ceil(v / step) * step : Math.round(v))

export function unitCostParts(usd: number, weightKg: number, s: Settings) {
  const product = usd * s.fxRate
  const service = product * (s.serviceFeePct / 100)
  const transport = Math.max(weightKg, s.minWeightKg) * s.transportPerKgUsd * s.fxRate
  const customs = product * (s.customsPct / 100)
  return { product, service, transport, customs }
}

/** Prix unique tout compris (hors livraison locale) affiché au client */
export function allInclusiveUnitPrice(usd: number, weightKg: number, s: Settings) {
  const p = unitCostParts(usd, weightKg, s)
  return roundUp(p.product + p.service + p.transport + p.customs, s.roundTo)
}

export function deliveryFee(mode: DeliveryMode, s: Settings) {
  if (mode === 'relais') return s.relayDeliveryFee
  return s.homeDeliveryFee
}

export function computeBreakdown(items: OrderItem[], mode: DeliveryMode, s: Settings, credit = 0): PriceBreakdown {
  let productCost = 0, transport = 0, customs = 0, itemsTotal = 0
  for (const it of items) {
    const p = unitCostParts(it.supplierPriceUsd, it.weightKg, s)
    productCost += p.product * it.qty
    transport += p.transport * it.qty
    customs += p.customs * it.qty
    itemsTotal += it.unitPrice * it.qty
  }
  let express = 0
  if (mode === 'express') express = roundUp(transport * (s.expressSurchargePct / 100), s.roundTo)
  const delivery = deliveryFee(mode, s) + express
  const gross = itemsTotal + delivery
  const discount = Math.min(credit, Math.floor(gross * 0.5))
  const total = gross - discount
  const serviceFee = itemsTotal - productCost - transport - customs
  return {
    productCost: Math.round(productCost),
    serviceFee: Math.round(serviceFee),
    transport: Math.round(transport + express),
    customs: Math.round(customs),
    delivery: deliveryFee(mode, s),
    discount,
    total,
  }
}

export function promisedDate(from: Date, mode: DeliveryMode, s: Settings) {
  const days = mode === 'express' ? s.expressDaysMax : s.standardDaysMax
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function deliveryWindow(mode: DeliveryMode, s: Settings) {
  return mode === 'express' ? `${s.expressDaysMin}-${s.expressDaysMax} jours` : `${s.standardDaysMin}-${s.standardDaysMax} jours`
}

/** Coût réel (ou estimé si non saisi) et marge nette d'une commande */
export function orderEconomics(o: Order) {
  const b = o.breakdown
  const product = o.realCosts.product ?? b.productCost
  const transport = o.realCosts.transport ?? b.transport
  const customs = o.realCosts.customs ?? b.customs
  const delivery = o.realCosts.delivery ?? Math.round(b.delivery * 0.7)
  const cost = product + transport + customs + delivery
  const revenue = o.total
  const margin = revenue - cost
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0
  const isReal = o.realCosts.product !== undefined
  return { product, transport, customs, delivery, cost, revenue, margin, marginPct, isReal }
}
