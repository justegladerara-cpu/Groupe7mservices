import type {
  Claim, City, Courier, Forwarder, LinkRequest, Notification, Order, OrderItem, OrderStatus, PaymentOperator, Product,
  PurchaseBatch, RelayPoint, Review, Risk, RoadmapTask, Settings, Shipment, Supplier, Template, User, Category, AuditEntry,
} from './types'
import { allInclusiveUnitPrice, computeBreakdown, promisedDate } from './pricing'
import { STATUS_FLOW, STATUS_LABEL, STATUS_CLIENT_TEXT } from './constants'

export const DEFAULT_SETTINGS: Settings = {
  brandName: 'HHHGroup',
  currency: 'XAF',
  currencySymbol: 'FCFA',
  fxRate: 600,
  serviceFeePct: 35,
  transportPerKgUsd: 11,
  minWeightKg: 0.5,
  customsPct: 10,
  homeDeliveryFee: 1500,
  relayDeliveryFee: 500,
  expressEnabled: false,
  expressSurchargePct: 60,
  standardDaysMin: 15,
  standardDaysMax: 25,
  expressDaysMin: 7,
  expressDaysMax: 12,
  roundTo: 100,
  referralReward: 1000,
  referralWelcome: 1000,
  monthlyFixedCosts: 300_000,
  targetMarginPct: 20,
  whatsappNumber: '',
  supportEmail: 'contact@hhhgroup.cg',
  launchCity: 'Brazzaville',
  quoteValidityDays: 3,
  paymentsLive: false,
}

// Générateur pseudo-aléatoire déterministe : les données de démo sont identiques à chaque réinitialisation
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SUPPLIERS: Supplier[] = [
  { id: 'sup-shein', name: 'SHEIN', kind: 'catalogue', website: 'https://www.shein.com', domains: ['shein.com', 'shein.co', 'sheinside'], apiAvailable: false, notes: 'Option A — catalogue désiré par la cible. Pas d’API de commande : achat piloté par l’équipe, groupé et planifié.', active: true },
  { id: 'sup-cj', name: 'CJ Dropshipping', kind: 'dropship_api', website: 'https://cjdropshipping.com', domains: ['cjdropshipping.com'], apiAvailable: true, notes: 'Option B — API de commande automatique disponible. Test en parallèle sur la catégorie Tech & gadgets.', active: true },
  { id: 'sup-aliexpress', name: 'AliExpress', kind: 'grossiste', website: 'https://www.aliexpress.com', domains: ['aliexpress.com', 'aliexpress.us', 'a.aliexpress'], apiAvailable: true, notes: 'Source secondaire pour accessoires et beauté.', active: true },
  { id: 'sup-alibaba', name: 'Alibaba', kind: 'grossiste', website: 'https://www.alibaba.com', domains: ['alibaba.com', '1688.com'], apiAvailable: true, notes: 'Achats en gros pour les best-sellers (stock tampon).', active: false },
]

const P: [string, Category, string, number, number, string, number, string[], string[], string][] = [
  ['Robe midi satinée à bretelles', 'Mode femme', 'sup-shein', 14.5, 0.35, 'dress', 330, ['XS', 'S', 'M', 'L', 'XL'], ['Champagne', 'Noir', 'Vert émeraude'], 'Robe fluide en satin, coupe midi, parfaite pour les cérémonies et les sorties.'],
  ['Ensemble deux pièces côtelé', 'Mode femme', 'sup-shein', 17.9, 0.45, 'tshirt', 20, ['S', 'M', 'L', 'XL'], ['Beige', 'Rose poudré', 'Noir'], 'Haut court et jupe assortie en maille côtelée stretch.'],
  ['Robe longue imprimé floral', 'Mode femme', 'sup-shein', 19.0, 0.4, 'dress', 140, ['S', 'M', 'L', 'XL', 'XXL'], ['Bleu', 'Jaune'], 'Robe longue légère, ceinture à nouer, tissu respirant.'],
  ['Jean taille haute wide leg', 'Mode femme', 'sup-shein', 21.5, 0.6, 'jeans', 220, ['26', '28', '30', '32', '34'], ['Bleu clair', 'Bleu brut'], 'Jean large taille haute, tendance et confortable.'],
  ['Top corset à manches bouffantes', 'Mode femme', 'sup-shein', 11.9, 0.25, 'tshirt', 350, ['XS', 'S', 'M', 'L'], ['Blanc', 'Noir', 'Lilas'], 'Top structuré à manches bouffantes, idéal avec un jean.'],
  ['Chemise oversize en lin', 'Mode homme', 'sup-shein', 16.0, 0.35, 'shirt', 30, ['M', 'L', 'XL', 'XXL'], ['Blanc', 'Kaki', 'Bleu ciel'], 'Chemise ample en lin mélangé, look décontracté chic.'],
  ['T-shirt graphique coton lourd', 'Mode homme', 'sup-shein', 9.5, 0.3, 'tshirt', 200, ['S', 'M', 'L', 'XL', 'XXL'], ['Noir', 'Blanc', 'Gris'], 'T-shirt 100 % coton 240 g, imprimé streetwear.'],
  ['Pantalon cargo ample', 'Mode homme', 'sup-shein', 18.5, 0.6, 'jeans', 90, ['28', '30', '32', '34', '36'], ['Kaki', 'Noir'], 'Cargo multipoches, coupe relax.'],
  ['Casquette brodée', 'Mode homme', 'sup-aliexpress', 6.5, 0.15, 'cap', 210, ['Unique'], ['Noir', 'Beige', 'Bordeaux'], 'Casquette coton ajustable, broderie frontale.'],
  ['Escarpins à talon carré', 'Chaussures', 'sup-shein', 22.0, 0.8, 'heels', 0, ['36', '37', '38', '39', '40', '41'], ['Nude', 'Noir', 'Rouge'], 'Escarpins confortables, talon carré 7 cm.'],
  ['Sandales à brides dorées', 'Chaussures', 'sup-shein', 15.5, 0.6, 'heels', 45, ['36', '37', '38', '39', '40'], ['Doré', 'Argent'], 'Sandales élégantes à fines brides métallisées.'],
  ['Baskets plateforme blanches', 'Chaussures', 'sup-shein', 24.0, 1.0, 'sneaker', 260, ['36', '37', '38', '39', '40', '41', '42'], ['Blanc', 'Blanc/rose'], 'Baskets à semelle épaisse, style minimaliste.'],
  ['Baskets running homme', 'Chaussures', 'sup-cj', 27.5, 1.1, 'sneaker', 190, ['40', '41', '42', '43', '44', '45'], ['Noir', 'Gris/orange'], 'Baskets légères en mesh respirant.'],
  ['Sac cabas en cuir synthétique', 'Sacs & accessoires', 'sup-shein', 18.0, 0.7, 'bag', 25, ['Unique'], ['Camel', 'Noir', 'Crème'], 'Grand sac cabas avec pochette intérieure zippée.'],
  ['Mini sac à main matelassé', 'Sacs & accessoires', 'sup-shein', 13.5, 0.4, 'clutch', 300, ['Unique'], ['Noir', 'Blanc', 'Rose'], 'Petit sac matelassé à chaîne dorée.'],
  ['Lunettes de soleil oversize', 'Sacs & accessoires', 'sup-aliexpress', 7.9, 0.15, 'sunglasses', 40, ['Unique'], ['Noir', 'Écaille'], 'Lunettes UV400, monture oversize.'],
  ['Portefeuille compact homme', 'Sacs & accessoires', 'sup-aliexpress', 8.5, 0.15, 'wallet', 25, ['Unique'], ['Noir', 'Marron'], 'Portefeuille RFID, 8 emplacements cartes.'],
  ['Palette fards à paupières 18 teintes', 'Beauté', 'sup-shein', 8.9, 0.2, 'skincare', 15, ['Unique'], ['Nude', 'Sunset'], 'Palette pigmentée, finis mats et irisés.'],
  ['Rouge à lèvres mat longue tenue (lot de 3)', 'Beauté', 'sup-shein', 7.5, 0.1, 'lipstick', 350, ['Unique'], ['Nudes', 'Rouges'], 'Trio de rouges à lèvres mats, tenue 12 h.'],
  ['Sérum vitamine C éclat', 'Beauté', 'sup-aliexpress', 9.9, 0.15, 'skincare', 45, ['30 ml'], ['—'], 'Sérum unifiant pour un teint lumineux.'],
  ['Parfum floral 100 ml', 'Beauté', 'sup-aliexpress', 16.5, 0.45, 'perfume', 300, ['100 ml'], ['—'], 'Eau de parfum aux notes de jasmin et vanille.'],
  ['Perruque lace front lisse 20"', 'Beauté', 'sup-aliexpress', 39.0, 0.5, 'hair', 20, ['18"', '20"', '22"'], ['Noir naturel', 'Brun'], 'Perruque cheveux naturels, lace frontale HD.'],
  ['Montre femme bracelet maille', 'Bijoux & montres', 'sup-shein', 12.5, 0.2, 'watch', 40, ['Unique'], ['Doré', 'Or rose', 'Argent'], 'Montre quartz élégante, bracelet milanais.'],
  ['Collier superposé doré', 'Bijoux & montres', 'sup-shein', 5.9, 0.08, 'necklace', 45, ['Unique'], ['Doré'], 'Collier trois rangs acier inoxydable doré.'],
  ['Boucles d’oreilles pendantes', 'Bijoux & montres', 'sup-shein', 4.5, 0.05, 'earrings', 320, ['Unique'], ['Doré', 'Argent'], 'Boucles légères, hypoallergéniques.'],
  ['Montre connectée sport', 'Tech & gadgets', 'sup-cj', 24.9, 0.25, 'watchsmart', 200, ['Unique'], ['Noir', 'Rose'], 'Suivi cardio, notifications, autonomie 7 jours.'],
  ['Écouteurs sans fil Bluetooth', 'Tech & gadgets', 'sup-cj', 15.9, 0.2, 'headphones', 230, ['Unique'], ['Blanc', 'Noir'], 'Écouteurs avec boîtier de charge, Bluetooth 5.3.'],
  ['Coque & verre trempé iPhone', 'Tech & gadgets', 'sup-cj', 6.9, 0.1, 'phone', 260, ['iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16'], ['Transparent', 'Noir'], 'Coque antichoc + protection d’écran.'],
  ['Casque audio pliable', 'Tech & gadgets', 'sup-cj', 21.0, 0.4, 'headphones', 280, ['Unique'], ['Noir', 'Blanc', 'Beige'], 'Casque Bluetooth, réduction de bruit passive.'],
  ['Lampe LED d’ambiance', 'Maison', 'sup-cj', 13.5, 0.7, 'lamp', 35, ['Unique'], ['Blanc'], 'Lampe tactile, 3 températures de lumière.'],
  ['Housses de coussin velours (x2)', 'Maison', 'sup-shein', 9.0, 0.4, 'cushion', 160, ['45x45'], ['Vert', 'Moutarde', 'Rose'], 'Lot de 2 housses en velours doux.'],
  ['Ensemble pyjama satin', 'Mode femme', 'sup-shein', 15.0, 0.35, 'shirt', 300, ['S', 'M', 'L', 'XL'], ['Champagne', 'Bordeaux'], 'Pyjama chemise et pantalon en satin.'],
]

export function buildProducts(): Product[] {
  const created = new Date('2026-05-10').toISOString()
  return P.map((p, i) => ({
    id: `prd-${i + 1}`,
    name: p[0], category: p[1], supplierId: p[2], supplierPriceUsd: p[3], weightKg: p[4], glyph: p[5], hue: p[6],
    sizes: p[7], colors: p[8], description: p[9],
    supplierUrl: SUPPLIERS.find((s) => s.id === p[2])!.website,
    image: '', tags: [], active: true, featured: [0, 3, 11, 13, 21, 25, 14, 9].includes(i), createdAt: created,
  }))
}

const FIRST = ['Grace', 'Merveille', 'Ornella', 'Divine', 'Glodie', 'Exaucée', 'Benedicte', 'Prisca', 'Christelle', 'Nadège', 'Rachel', 'Sarah', 'Dorcas', 'Esther', 'Fiston', 'Patrick', 'Héritier', 'Junior', 'Ruth', 'Plamedie', 'Gloire', 'Jonathan', 'Ketsia', 'Daniella', 'Emmanuel', 'Chancelvie', 'Naomi', 'Arsène', 'Mireille', 'Josué', 'Lydie', 'Cédric', 'Falonne', 'Benjamin', 'Gracia', 'Deborah', 'Christian', 'Sandrine', 'Trésor', 'Bijou', 'Precieuse', 'Yannick']
const LAST = ['Mabiala', 'Moukoko', 'Ngoma', 'Bouanga', 'Massamba', 'Makosso', 'Nkounkou', 'Malonga', 'Mbemba', 'Okemba', 'Itoua', 'Obambi', 'Loemba', 'Tchicaya', 'Mavoungou', 'Samba', 'Kimbembe', 'Bakala', 'Ondongo', 'Mboungou', 'Nganga', 'Elenga']
export const COMMUNES = ['Bacongo', 'Makélékélé', 'Poto-Poto', 'Moungali', 'Ouenzé', 'Talangaï', 'Mfilou', 'Madibou', 'Djiri', 'Plateau (centre-ville)', 'Pointe-Noire — Lumumba', 'Pointe-Noire — Tié-Tié', 'Pointe-Noire — Loandjili', 'Pointe-Noire — Mvou-Mvou']

export const RELAY_POINTS: RelayPoint[] = [
  { id: 'rp-poto', name: 'Point relais Poto-Poto — Marché', commune: 'Poto-Poto', address: 'Avenue de la Paix, face au marché de Poto-Poto', hours: 'Lun-Sam 8h30-18h30', phone: '+242 06 000 1001', active: true },
  { id: 'rp-bacongo', name: 'Point relais Bacongo — Marché Total', commune: 'Bacongo', address: 'Avenue Matsoua, près du marché Total', hours: 'Lun-Sam 9h-18h', phone: '+242 06 000 1002', active: true },
  { id: 'rp-moungali', name: 'Point relais Moungali — Rond-point', commune: 'Moungali', address: 'Rond-point Moungali, avenue des Trois Martyrs', hours: 'Lun-Sam 9h-18h30', phone: '+242 06 000 1003', active: true },
  { id: 'rp-talangai', name: 'Point relais Talangaï — Marché', commune: 'Talangaï', address: 'Avenue Marien Ngouabi, marché de Talangaï', hours: 'Lun-Sam 9h-18h', phone: '+242 06 000 1004', active: true },
  { id: 'rp-pnr', name: 'Point relais Pointe-Noire — Grand Marché', commune: 'Pointe-Noire — Lumumba', address: 'Avenue Charles de Gaulle, près du Grand Marché', hours: 'Lun-Sam 9h-18h', phone: '+242 05 000 1005', active: true },
  { id: 'rp-tietie', name: 'Point relais Pointe-Noire — Tié-Tié', commune: 'Pointe-Noire — Tié-Tié', address: 'Rond-point Kassaï', hours: 'Lun-Ven 9h-17h', phone: '+242 05 000 1006', active: false },
]

export const COURIERS: Courier[] = [
  { id: 'crr-1', name: 'Jean-Marie Mabiala', phone: '+242 06 000 2001', zone: 'Brazzaville sud : Bacongo, Makélékélé, Plateau, Mfilou', vehicle: 'Moto', active: true },
  { id: 'crr-2', name: 'Didier Okemba', phone: '+242 06 000 2002', zone: 'Brazzaville nord : Poto-Poto, Moungali, Ouenzé, Talangaï, Djiri', vehicle: 'Moto', active: true },
  { id: 'crr-3', name: 'Océan Express Livraison', phone: '+242 05 000 2003', zone: 'Tout Pointe-Noire', vehicle: 'Voiture', active: true },
]

export const FORWARDERS: Forwarder[] = [
  { id: 'fwd-1', name: 'Congo Fret Express', contact: 'M. Nkounkou', phone: '+242 06 000 3001', route: 'Guangzhou → Brazzaville Maya-Maya (aérien groupé)', ratePerKgUsd: 9.5, avgDays: 14, active: true, notes: 'Partenaire unique au lancement. Groupage hebdomadaire le mardi. Assurance colis groupés incluse au-delà de 50 kg. Réexpédition vers Pointe-Noire par route ou vol intérieur.' },
  { id: 'fwd-2', name: 'Atlantic Cargo PNR', contact: 'Mme Loemba', phone: '+242 05 000 3002', route: 'Paris/Guangzhou → Pointe-Noire', ratePerKgUsd: 12, avgDays: 10, active: false, notes: 'Solution de secours, plus rapide mais plus chère. Candidat pour le niveau Express.' },
]

export const OPERATORS: PaymentOperator[] = [
  { id: 'mtn', name: 'MTN Mobile Money', short: 'MTN MoMo', color: '#facc15', active: true, merchantCode: 'À configurer' },
  { id: 'airtel', name: 'Airtel Money', short: 'Airtel Money', color: '#dc2626', active: true, merchantCode: 'À configurer' },
]

export const TEMPLATES: Template[] = [
  { id: 'bienvenue', title: 'Bienvenue chez {marque}', body: 'Bonjour {prenom}, bienvenue chez {marque} ! Tu choisis, tu paies, nous nous occupons du reste. Ton code parrainage : {code}.', channels: ['whatsapp', 'email', 'app'] },
  { id: 'attente_paiement', title: 'Commande {numero} enregistrée', body: 'Bonjour {prenom}, ta commande {numero} ({total}) est enregistrée. Finalise le paiement Mobile Money pour la lancer.', channels: ['whatsapp', 'sms', 'app'] },
  { id: 'paiement_confirme', title: 'Paiement reçu — {numero}', body: 'Merci {prenom} ! Paiement de {total} reçu pour la commande {numero}. Livraison prévue avant le {date_promise}.', channels: ['whatsapp', 'sms', 'email', 'app'] },
  { id: 'achat_fournisseur', title: 'Articles commandés — {numero}', body: 'Bonne nouvelle {prenom} : les articles de ta commande {numero} sont commandés chez notre fournisseur.', channels: ['whatsapp', 'app'] },
  { id: 'en_transit', title: 'Ton colis voyage — {numero}', body: '{prenom}, ton colis {numero} est en route vers le Congo avec notre transitaire. Suivi : {suivi}.', channels: ['whatsapp', 'sms', 'app'] },
  { id: 'dedouanement', title: 'Colis arrivé — {numero}', body: '{prenom}, ton colis {numero} est arrivé au Congo. Nous gérons la douane, rien à faire de ton côté.', channels: ['whatsapp', 'app'] },
  { id: 'en_livraison', title: 'Livraison en cours — {numero}', body: '{prenom}, ton colis {numero} est en livraison ({mode_livraison}). Garde ton téléphone à portée de main.', channels: ['whatsapp', 'sms', 'app'] },
  { id: 'livree', title: 'Colis livré — {numero}', body: 'Colis {numero} remis. Merci {prenom} ! Donne ton avis en 1 minute, il aide d’autres clients à nous faire confiance.', channels: ['whatsapp', 'email', 'app'] },
  { id: 'annulee', title: 'Commande annulée — {numero}', body: '{prenom}, ta commande {numero} a été annulée. Si un paiement a été fait, il te sera remboursé.', channels: ['whatsapp', 'sms', 'app'] },
  { id: 'devis_pret', title: 'Ton devis est prêt — {numero}', body: '{prenom}, le prix tout compris de ton article est de {total}. Valide-le sous {validite} jours pour lancer la commande.', channels: ['whatsapp', 'app'] },
  { id: 'reclamation_maj', title: 'Réclamation {numero} mise à jour', body: '{prenom}, ta réclamation {numero} a été mise à jour : {statut}.', channels: ['whatsapp', 'app'] },
]

export const RISKS: Risk[] = [
  { id: 'rsk-1', title: 'Dépendance à un seul fournisseur (SHEIN)', impact: 'Élevé', probability: 'Moyenne', mitigation: 'Tester une 2e source dropship en parallèle dès le mois 2 (CJ Dropshipping sur Tech & gadgets).', owner: 'Direction', status: 'ouvert', lastReview: '2026-11-03' },
  { id: 'rsk-2', title: 'Retard ou perte en transit', impact: 'Élevé', probability: 'Moyenne', mitigation: 'Partenaire transitaire unique et fiable, assurance sur colis groupés.', owner: 'Opérations', status: 'maitrise', lastReview: '2026-11-03' },
  { id: 'rsk-3', title: 'Marge insuffisante après coûts réels', impact: 'Moyen', probability: 'Moyenne', mitigation: 'Ne pas fixer le prix final avant 20-30 commandes tests. Suivi de la marge réelle par commande.', owner: 'Direction', status: 'maitrise', lastReview: '2026-11-03' },
  { id: 'rsk-4', title: 'Litiges & retours produits internationaux', impact: 'Moyen', probability: 'Faible', mitigation: 'Politique claire communiquée avant achat, provision financière dédiée.', owner: 'Service client', status: 'ouvert', lastReview: '2026-11-03' },
  { id: 'rsk-5', title: 'Charge manuelle qui explose avec le volume', impact: 'Moyen', probability: 'Élevée', mitigation: 'Automatiser commande/paiement/suivi en priorité, garder l’achat groupé et planifié.', owner: 'Opérations', status: 'ouvert', lastReview: '2026-11-03' },
]

export const ROADMAP: RoadmapTask[] = [
  ['Semaine 1-2', 'Canal WhatsApp Business ouvert', true],
  ['Semaine 1-2', 'Partenaire transitaire signé', true],
  ['Semaine 1-2', 'Pricing test défini', true],
  ['Jour 15-30', '10-15 premières commandes traitées', true],
  ['Jour 15-30', 'Réseau perso + micro-influenceurs mobilisés', true],
  ['Jour 15-30', 'Marge réelle mesurée vs cible', true],
  ['Jour 30-60', 'Plateforme web v1 (commande + paiement automatisés)', true],
  ['Jour 30-60', 'Process achat équipe formalisé', true],
  ['Jour 60-90', 'Notifications automatiques', true],
  ['Jour 60-90', 'Niveau livraison express testé', false],
  ['Jour 60-90', 'Décision : scaler ou ajuster', false],
  ['Plus tard', 'Raccorder le paiement Mobile Money (agrégateur)', false],
  ['Plus tard', 'Application mobile', false],
  ['Plus tard', 'Automatisation de l’achat fournisseur (API dropship)', false],
].map(([phase, title, done], i) => ({ id: `rm-${i + 1}`, phase: phase as string, title: title as string, done: done as boolean }))

export const CITIES: City[] = [
  { id: 'city-bzv', name: 'Brazzaville', country: 'République du Congo', status: 'active', condition: 'Ville de lancement — persona Grace, 18-30 ans.' },
  { id: 'city-pnr', name: 'Pointe-Noire', country: 'République du Congo', status: 'pilote', condition: 'Pilote ouvert : point relais Grand Marché + livreur partenaire.' },
  { id: 'city-dolisie', name: 'Dolisie', country: 'République du Congo', status: 'planifiee', condition: 'Après 3 mois consécutifs au-dessus du seuil de rentabilité à Brazzaville.' },
  { id: 'city-lbv', name: 'Libreville', country: 'Gabon', status: 'planifiee', condition: 'Expansion CEMAC : même devise (FCFA), répliquer le modèle validé.' },
  { id: 'city-dla', name: 'Douala / Yaoundé', country: 'Cameroun', status: 'planifiee', condition: 'Expansion CEMAC : marché le plus grand de la zone.' },
  { id: 'city-bgf', name: 'Bangui', country: 'Centrafrique', status: 'planifiee', condition: 'Expansion CEMAC.' },
  { id: 'city-ndj', name: 'N’Djamena', country: 'Tchad', status: 'planifiee', condition: 'Expansion CEMAC.' },
  { id: 'city-ssg', name: 'Malabo', country: 'Guinée équatoriale', status: 'planifiee', condition: 'Expansion CEMAC.' },
  { id: 'city-kin', name: 'Kinshasa', country: 'RDC', status: 'planifiee', condition: 'Afrique centrale hors CEMAC : autre devise et autres opérateurs Mobile Money.' },
]

export interface SeedData {
  users: User[]; products: Product[]; orders: Order[]; linkRequests: LinkRequest[]; suppliers: Supplier[]
  batches: PurchaseBatch[]; shipments: Shipment[]; forwarders: Forwarder[]; couriers: Courier[]; relayPoints: RelayPoint[]
  operators: PaymentOperator[]; notifications: Notification[]; reviews: Review[]; claims: Claim[]; risks: Risk[]
  roadmap: RoadmapTask[]; cities: City[]; settings: Settings; templates: Template[]; audit: AuditEntry[]
}

const REVIEW_TEXTS = [
  'Enfin une plateforme sérieuse ! Ma robe est arrivée en 19 jours, exactement comme sur la photo.',
  'J’ai payé avec MTN MoMo en 1 minute. J’ai reçu des messages WhatsApp à chaque étape, je n’ai jamais eu besoin de relancer.',
  'Avant je passais par des revendeurs sur Instagram, j’ai perdu de l’argent deux fois. Ici tout est clair, le prix ne change pas.',
  'Récupéré au point relais de Poto-Poto, très pratique. Je recommande.',
  'Un peu long (24 jours) mais dans le délai annoncé. Produit conforme.',
  'Le service client a répondu vite quand j’avais une question sur la taille.',
  'Les baskets sont top ! Livraison à domicile à Bacongo sans souci.',
  'J’ai collé le lien SHEIN, on m’a donné le prix tout compris le jour même. Simple.',
  'Très bon suivi, colis bien emballé. Ma deuxième commande déjà !',
  'Prix correct vu que tout est compris : douane, transport, livraison. Pas de surprise.',
  'Ma perruque est magnifique, merci HHHGroup.',
  'Le parfum est arrivé intact. Je vais commander pour ma sœur.',
]

export function buildSeed(): SeedData {
  const r = rng(20261119)
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
  const now = new Date('2026-11-19T09:00:00Z')
  const settings = { ...DEFAULT_SETTINGS }
  const products = buildProducts()
  const relayActive = RELAY_POINTS.filter((x) => x.active)

  const users: User[] = [
    { id: 'usr-admin', name: 'Hortense Hamba', email: 'admin@hhhgroup.cg', phone: '+242 06 000 0001', password: 'admin1234', role: 'admin', city: 'Brazzaville', referralCode: 'HHH-ADMIN', credit: 0, createdAt: '2026-05-01T08:00:00Z', active: true },
    { id: 'usr-ops', name: 'Patrick Massamba', email: 'achats@hhhgroup.cg', phone: '+242 06 000 0002', password: 'ops1234', role: 'operations', city: 'Brazzaville', referralCode: 'HHH-OPS', credit: 0, createdAt: '2026-05-01T08:00:00Z', active: true },
    { id: 'usr-support', name: 'Ruth Malonga', email: 'support@hhhgroup.cg', phone: '+242 06 000 0003', password: 'support1234', role: 'support', city: 'Brazzaville', referralCode: 'HHH-SUP', credit: 0, createdAt: '2026-05-01T08:00:00Z', active: true },
    { id: 'usr-grace', name: 'Grace Mabiala', email: 'grace@demo.cg', phone: '+242 06 000 1024', password: 'demo1234', role: 'client', city: 'Brazzaville', commune: 'Moungali', address: '12, rue Mbochis, quartier Plateau des 15 ans', referralCode: 'GRACE24', credit: 1000, createdAt: '2026-06-02T10:00:00Z', active: true },
  ]
  const clients: User[] = [users[3]]
  for (let i = 0; i < 88; i++) {
    const fn = FIRST[(i + 1) % FIRST.length], ln = LAST[(i * 7) % LAST.length]
    const created = new Date(new Date('2026-05-20').getTime() + r() * (now.getTime() - new Date('2026-05-20').getTime()) * 0.9)
    const u: User = {
      id: `usr-c${i + 1}`, name: `${fn} ${ln}`, email: `${fn.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${ln.toLowerCase()}${i}@exemple.cg`,
      phone: `+242 0${i % 3 === 0 ? 5 : 6} 000 ${String(1100 + i).padStart(4, '0')}`, password: 'demo1234', role: 'client', city: 'Brazzaville',
      commune: pick(COMMUNES), address: `${1 + Math.floor(r() * 120)}, avenue ${pick(['de la Paix', 'des Trois Martyrs', 'Matsoua', 'Marien Ngouabi', 'Loutassi', 'de France', 'Charles de Gaulle'])}`,
      referralCode: `${fn.toUpperCase().slice(0, 5).normalize('NFD').replace(/[̀-ͯ]/g, '')}${i + 10}`,
      referredBy: i % 5 === 0 ? 'GRACE24' : undefined, credit: 0, createdAt: created.toISOString(), active: true,
    }
    users.push(u); clients.push(u)
  }

  const orders: Order[] = []
  const notifications: Notification[] = []
  const reviews: Review[] = []
  let seq = 1
  const start = new Date('2026-05-25T09:00:00Z').getTime()
  const total = 150
  for (let k = 0; k < total; k++) {
    // Croissance progressive : plus de commandes récemment
    const t = Math.pow(r(), 0.65)
    const created = new Date(start + t * (now.getTime() - start - 3600_000))
    const isGrace = k % 13 === 0
    const cust = isGrace ? users[3] : clients[Math.floor(Math.pow(r(), 1.4) * clients.length)]
    const n = 1 + Math.floor(Math.pow(r(), 2) * 3)
    const items: OrderItem[] = []
    for (let j = 0; j < n; j++) {
      const p = j === 0 ? pick(products) : pick(products.filter((x) => x.supplierId === items[0]?.supplierId))
      if (!p || items.find((x) => x.productId === p.id)) continue
      items.push({
        productId: p.id, name: p.name, image: p.image, glyph: p.glyph, hue: p.hue, size: pick(p.sizes), color: pick(p.colors), qty: r() < 0.85 ? 1 : 2,
        supplierId: p.supplierId, supplierUrl: p.supplierUrl, supplierPriceUsd: p.supplierPriceUsd, weightKg: p.weightKg,
        unitPrice: allInclusiveUnitPrice(p.supplierPriceUsd, p.weightKg, settings),
      })
    }
    const delivery = r() < 0.45 ? 'relais' : 'domicile'
    const breakdown = computeBreakdown(items, delivery, settings, 0)
    const ageDays = (now.getTime() - created.getTime()) / 86400000
    // Statut en fonction de l'âge de la commande
    let stage: number
    if (ageDays > 30) stage = 6
    else if (ageDays > 24) stage = r() < 0.75 ? 6 : 5
    else if (ageDays > 17) stage = r() < 0.4 ? 6 : r() < 0.6 ? 5 : 4
    else if (ageDays > 10) stage = r() < 0.6 ? 3 : 4
    else if (ageDays > 4) stage = r() < 0.6 ? 2 : 3
    else if (ageDays > 1) stage = r() < 0.7 ? 1 : 2
    else stage = r() < 0.5 ? 0 : 1
    const cancelled = r() < 0.03 && stage < 3
    const history = [] as Order['history']
    const stepDays = [0, 0.05, 2 + r() * 3, 5 + r() * 3, 15 + r() * 4, 17 + r() * 3, 19 + r() * 4]
    for (let s = 0; s <= stage; s++) {
      const at = new Date(created.getTime() + stepDays[s] * 86400000)
      history.push({ status: STATUS_FLOW[s], at: at.toISOString(), by: s <= 1 ? 'Système' : s === 2 ? 'Patrick Massamba' : s <= 4 ? 'Congo Fret Express' : 'Équipe livraison' })
    }
    const status: OrderStatus = cancelled ? 'annulee' : STATUS_FLOW[stage]
    if (cancelled) history.push({ status: 'annulee', at: new Date(created.getTime() + 86400000).toISOString(), by: 'Ruth Malonga', note: 'Demande du client (changement d’avis avant achat)' })
    const ratio = () => 0.85 + r() * 0.3
    const realCosts = stage >= 2 && !cancelled ? {
      product: Math.round(breakdown.productCost * (0.9 + r() * 0.15)),
      ...(stage >= 3 ? { transport: Math.round(breakdown.transport * ratio() * 0.88) } : {}),
      ...(stage >= 4 ? { customs: Math.round(breakdown.customs * ratio()) } : {}),
      ...(stage >= 6 ? { delivery: delivery === 'relais' ? 300 : 1000 } : {}),
    } : {}
    const number = `HHH-${String(1000 + seq++)}`
    const o: Order = {
      id: `ord-${k + 1}`, number, customerId: cust.id, items, delivery,
      relayPointId: delivery === 'relais' ? pick(relayActive).id : undefined,
      commune: cust.commune, address: delivery === 'domicile' ? cust.address : undefined, phone: cust.phone,
      paymentOperator: pick(['mtn', 'mtn', 'airtel']),
      paymentRef: stage >= 1 ? `MM${Math.floor(100000000 + r() * 899999999)}` : undefined,
      paidAt: stage >= 1 ? history[1].at : undefined,
      breakdown, total: breakdown.total, status, history,
      courierId: stage >= 5 && delivery === 'domicile' ? pick(COURIERS).id : undefined,
      promisedDate: promisedDate(created, delivery, settings),
      deliveredAt: stage === 6 && !cancelled ? history[6].at : undefined,
      realCosts, internalNotes: '', createdAt: created.toISOString(),
    }
    orders.push(o)
    if (cust.id === 'usr-grace') {
      for (const h of history) {
        notifications.push({ id: `ntf-${notifications.length + 1}`, customerId: cust.id, orderId: o.id, channels: ['app', 'whatsapp', 'sms'], title: `${number} — ${STATUS_LABEL[h.status]}`, body: STATUS_CLIENT_TEXT[h.status], at: h.at, read: ageDays > 3, deliveryStatus: 'simule' })
      }
    }
    if (stage === 6 && !cancelled && r() < 0.35) {
      reviews.push({ id: `rev-${reviews.length + 1}`, customerId: cust.id, orderId: o.id, productId: items[0].productId, rating: r() < 0.7 ? 5 : r() < 0.8 ? 4 : 3, comment: REVIEW_TEXTS[reviews.length % REVIEW_TEXTS.length], at: new Date(new Date(o.deliveredAt!).getTime() + 86400000).toISOString(), status: reviews.length % 9 === 8 ? 'en_attente' : 'publie' })
    }
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Lots d'achat : regroupement hebdomadaire par fournisseur
  const batches: PurchaseBatch[] = []
  const shipments: Shipment[] = []
  const weekKey = (iso: string) => { const d = new Date(iso); const onejan = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-${Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)}` }
  const purchased = orders.filter((o) => o.history.some((h) => h.status === 'achat_fournisseur') && o.status !== 'annulee')
  const groups = new Map<string, Order[]>()
  for (const o of purchased) {
    const h = o.history.find((x) => x.status === 'achat_fournisseur')!
    const key = `${weekKey(h.at)}|${o.items[0].supplierId}`
    groups.set(key, [...(groups.get(key) ?? []), o])
  }
  let bseq = 1
  for (const [key, os] of [...groups.entries()].sort()) {
    const supplierId = key.split('|')[1]
    const at = os.map((o) => o.history.find((x) => x.status === 'achat_fournisseur')!.at).sort()[0]
    const b: PurchaseBatch = {
      id: `bat-${bseq}`, number: `ACH-${String(bseq).padStart(3, '0')}`, supplierId, orderIds: os.map((o) => o.id),
      supplierOrderRef: supplierId === 'sup-shein' ? `GSH${Math.floor(10000000 + r() * 89999999)}` : supplierId === 'sup-cj' ? `CJ${Math.floor(1000000 + r() * 8999999)}` : `AE${Math.floor(100000000 + r() * 899999999)}`,
      amountUsd: Math.round(os.reduce((s, o) => s + o.items.reduce((a, it) => a + it.supplierPriceUsd * it.qty, 0), 0) * (0.92 + r() * 0.1) * 100) / 100,
      buyer: 'Patrick Massamba', createdAt: at, status: os.every((o) => STATUS_FLOW.indexOf(o.status) >= 3) ? 'recue_entrepot' : 'commandee',
    }
    batches.push(b); bseq++
    os.forEach((o) => (o.purchaseBatchId = b.id))
  }
  const transited = orders.filter((o) => o.history.some((h) => h.status === 'en_transit') && o.status !== 'annulee')
  const sgroups = new Map<string, Order[]>()
  for (const o of transited) {
    const key = weekKey(o.history.find((x) => x.status === 'en_transit')!.at)
    sgroups.set(key, [...(sgroups.get(key) ?? []), o])
  }
  let sseq = 1
  for (const [, os] of [...sgroups.entries()].sort()) {
    const dep = os.map((o) => o.history.find((x) => x.status === 'en_transit')!.at).sort()[0]
    const allArrived = os.every((o) => STATUS_FLOW.indexOf(o.status) >= 4)
    const weight = Math.round(os.reduce((s, o) => s + o.items.reduce((a, it) => a + Math.max(it.weightKg, 0.5) * it.qty, 0), 0) * 10) / 10
    const sh: Shipment = {
      id: `shp-${sseq}`, number: `EXP-${String(sseq).padStart(3, '0')}`, forwarderId: 'fwd-1', trackingNumber: `TCC-${Math.floor(100000 + r() * 899999)}`,
      orderIds: os.map((o) => o.id), weightKg: weight,
      transportCost: os.reduce((s, o) => s + (o.realCosts.transport ?? o.breakdown.transport), 0),
      customsCost: allArrived ? os.reduce((s, o) => s + (o.realCosts.customs ?? o.breakdown.customs), 0) : 0,
      insured: weight > 50, status: allArrived ? 'dedouanee' : 'en_transit', departedAt: dep,
      eta: new Date(new Date(dep).getTime() + 14 * 86400000).toISOString(),
      arrivedAt: allArrived ? new Date(new Date(dep).getTime() + 11 * 86400000).toISOString() : undefined,
      clearedAt: allArrived ? new Date(new Date(dep).getTime() + 13 * 86400000).toISOString() : undefined,
      createdAt: dep,
    }
    shipments.push(sh); sseq++
    os.forEach((o) => (o.shipmentId = sh.id))
  }

  // Demandes par lien (coller un lien produit)
  const linkSamples: [string, string, string, number | undefined, number | undefined][] = [
    ['https://www.shein.com/Solid-Ruched-Bodycon-Dress-p-28734512.html', 'Robe moulante froncée unie', 'nouvelle', undefined, undefined],
    ['https://www.shein.com/Plus-Size-Wide-Leg-Pants-p-31209877.html', 'Pantalon large grande taille', 'nouvelle', undefined, undefined],
    ['https://www.aliexpress.com/item/1005006234567890.html', 'Machine à coudre portable', 'nouvelle', undefined, undefined],
    ['https://www.shein.com/Men-Letter-Graphic-Hoodie-p-29910233.html', 'Sweat à capuche homme imprimé', 'chiffree', 18.9, 0.7],
    ['https://cjdropshipping.com/product/ring-light-18-inch-p-1720.html', 'Ring light 18 pouces avec trépied', 'chiffree', 26, 2.2],
    ['https://www.shein.com/Square-Toe-Mule-Sandals-p-27811234.html', 'Mules bout carré', 'acceptee', 16.5, 0.7],
    ['https://www.shein.com/Kids-Floral-Dress-p-30011223.html', 'Robe fillette fleurie', 'refusee', 9.9, 0.3],
    ['https://www.aliexpress.com/item/1005007788990011.html', 'Kit extensions de cils', 'expiree', 6.5, 0.1],
  ]
  const linkRequests: LinkRequest[] = linkSamples.map(([url, title, status, usd, w], i) => {
    const cust = i < 2 ? users[3] : clients[(i * 5) % clients.length]
    const created = new Date(now.getTime() - (i + 1) * 0.6 * 86400000)
    const sup = SUPPLIERS.find((s) => s.domains.some((d) => url.includes(d)))!
    return {
      id: `lnk-${i + 1}`, number: `DEV-${String(200 + i)}`, customerId: cust.id, url, supplierId: sup.id, title, qty: 1,
      size: ['M', 'XL', undefined, 'L', undefined, '39', '6 ans', undefined][i], color: ['Noir', 'Beige', undefined, 'Gris', undefined, 'Noir', 'Rose', undefined][i],
      clientNote: i === 0 ? 'Pour un mariage le mois prochain, c’est possible ?' : undefined,
      status: status as LinkRequest['status'], supplierPriceUsd: usd, weightKg: w,
      quotedUnitPrice: usd ? allInclusiveUnitPrice(usd, w!, settings) : undefined,
      createdAt: created.toISOString(), quotedAt: usd ? new Date(created.getTime() + 3 * 3600_000).toISOString() : undefined,
    }
  })

  // Réclamations
  const delivered = orders.filter((o) => o.status === 'livree')
  const claimSamples: [Claim['reason'], string, Claim['status'], Claim['resolution']?, number?][] = [
    ['non_conforme', 'La robe reçue est en taille S alors que j’ai commandé M.', 'en_cours'],
    ['endommage', 'La boîte du parfum était écrasée, le flacon est fissuré.', 'resolue', 'avoir', 4000],
    ['retard', 'Ma commande dépasse le délai annoncé de 25 jours.', 'resolue', 'aucune'],
    ['manquant', 'Il manque une des deux housses de coussin dans le colis.', 'ouverte'],
    ['non_conforme', 'La couleur des baskets ne correspond pas à la photo.', 'rejetee', 'aucune'],
    ['endommage', 'Écouteurs : le boîtier ne charge pas.', 'resolue', 'renvoi'],
  ]
  const claims: Claim[] = claimSamples.map(([reason, desc, status, resolution, refund], i) => {
    const o = i === 0 ? delivered.find((x) => x.customerId === 'usr-grace') ?? delivered[0] : delivered[(i * 7) % delivered.length]
    const cust = users.find((u) => u.id === o.customerId)!
    const created = new Date(new Date(o.deliveredAt!).getTime() + 86400000)
    const msgs: Claim['messages'] = [{ at: created.toISOString(), from: 'client', author: cust.name, text: desc }]
    if (status !== 'ouverte') msgs.push({ at: new Date(created.getTime() + 5 * 3600_000).toISOString(), from: 'equipe', author: 'Ruth Malonga', text: 'Bonjour, merci pour votre message. Pouvez-vous nous envoyer une photo de l’article reçu ? Nous traitons votre demande en priorité.' })
    if (status === 'resolue' || status === 'rejetee') msgs.push({ at: new Date(created.getTime() + 2 * 86400000).toISOString(), from: 'equipe', author: 'Ruth Malonga', text: status === 'resolue' ? 'Votre réclamation est résolue. Merci pour votre patience.' : 'Après vérification, la couleur correspond à la fiche fournisseur (variation d’écran). Nous restons disponibles.' })
    return {
      id: `clm-${i + 1}`, number: `REC-${String(30 + i)}`, orderId: o.id, customerId: cust.id, reason, description: desc, status, resolution, refundAmount: refund,
      messages: msgs, createdAt: created.toISOString(), closedAt: status === 'resolue' || status === 'rejetee' ? msgs[msgs.length - 1].at : undefined,
    }
  })

  notifications.sort((a, b) => b.at.localeCompare(a.at))
  return {
    users, products, orders, linkRequests, suppliers: SUPPLIERS, batches, shipments, forwarders: FORWARDERS, couriers: COURIERS,
    relayPoints: RELAY_POINTS, operators: OPERATORS, notifications, reviews, claims, risks: RISKS, roadmap: ROADMAP, cities: CITIES,
    settings, templates: TEMPLATES, audit: [{ id: 'aud-1', at: now.toISOString(), who: 'Système', action: 'Données de démonstration chargées' }],
  }
}
