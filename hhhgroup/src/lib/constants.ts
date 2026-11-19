import type { OrderStatus, Category, Channel } from './types'

export const STATUS_FLOW: OrderStatus[] = [
  'attente_paiement',
  'paiement_confirme',
  'achat_fournisseur',
  'en_transit',
  'dedouanement',
  'en_livraison',
  'livree',
]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  attente_paiement: 'En attente de paiement',
  paiement_confirme: 'Paiement confirmé',
  achat_fournisseur: 'Acheté chez le fournisseur',
  en_transit: 'En transit international',
  dedouanement: 'Arrivé — dédouanement',
  en_livraison: 'En cours de livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
}

export const STATUS_CLIENT_TEXT: Record<OrderStatus, string> = {
  attente_paiement: 'Ta commande est enregistrée. Elle sera lancée dès réception du paiement Mobile Money.',
  paiement_confirme: 'Paiement reçu. Notre équipe prépare l’achat de tes articles.',
  achat_fournisseur: 'Tes articles ont été commandés auprès du fournisseur international.',
  en_transit: 'Ton colis voyage vers le Congo avec notre transitaire partenaire.',
  dedouanement: 'Ton colis est arrivé. Nous nous occupons de la douane pour toi.',
  en_livraison: 'Ton colis est en route vers toi (ou t’attend au point relais).',
  livree: 'Colis remis. Merci pour ta confiance !',
  annulee: 'Commande annulée.',
}

export const STATUS_COLOR: Record<OrderStatus, string> = {
  attente_paiement: 'bg-amber-100 text-amber-800',
  paiement_confirme: 'bg-sky-100 text-sky-800',
  achat_fournisseur: 'bg-indigo-100 text-indigo-800',
  en_transit: 'bg-violet-100 text-violet-800',
  dedouanement: 'bg-fuchsia-100 text-fuchsia-800',
  en_livraison: 'bg-orange-100 text-orange-800',
  livree: 'bg-emerald-100 text-emerald-800',
  annulee: 'bg-slate-200 text-slate-600',
}

export const STATUS_OWNER: Record<OrderStatus, 'AUTOMATISÉ' | 'PILOTÉ PAR ÉQUIPE' | 'PARTENAIRE' | 'PARTENAIRE LOCAL' | '—'> = {
  attente_paiement: 'AUTOMATISÉ',
  paiement_confirme: 'AUTOMATISÉ',
  achat_fournisseur: 'PILOTÉ PAR ÉQUIPE',
  en_transit: 'PARTENAIRE',
  dedouanement: 'PARTENAIRE',
  en_livraison: 'PARTENAIRE LOCAL',
  livree: 'PARTENAIRE LOCAL',
  annulee: '—',
}

export const CATEGORIES: Category[] = [
  'Mode femme', 'Mode homme', 'Chaussures', 'Sacs & accessoires', 'Beauté', 'Bijoux & montres', 'Tech & gadgets', 'Maison',
]

export const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'E-mail', app: 'Application' }

export const CLAIM_REASON: Record<string, string> = {
  retard: 'Retard de livraison',
  non_conforme: 'Produit non conforme',
  endommage: 'Colis endommagé',
  manquant: 'Article manquant',
  autre: 'Autre',
}

export const CLAIM_STATUS: Record<string, string> = { ouverte: 'Ouverte', en_cours: 'En cours', resolue: 'Résolue', rejetee: 'Rejetée' }
export const LINK_STATUS: Record<string, string> = { nouvelle: 'À chiffrer', chiffree: 'Devis envoyé', acceptee: 'Acceptée', refusee: 'Refusée', expiree: 'Expirée' }
