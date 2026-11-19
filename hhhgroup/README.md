# HHHGroup — plateforme d'achat international

« Tu choisis, tu paies, nous nous occupons du reste. »

Plateforme qui permet aux clients de Kinshasa d'acheter sur SHEIN et d'autres boutiques
internationales, de payer en Mobile Money et de suivre leur colis jusqu'à la livraison.

## Démarrer

```bash
cd hhhgroup
npm install
npm run dev      # http://localhost:5173
npm run build    # site statique dans dist/
```

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Cliente (Grace) | grace@demo.cd | demo1234 |
| Administratrice | admin@hhhgroup.cd | admin1234 |
| Équipe achats & logistique | achats@hhhgroup.cd | ops1234 |
| Service client | support@hhhgroup.cd | support1234 |

La page de connexion propose aussi des boutons d'accès rapide.

## Contenu

**Site client** : catalogue (prix unique tout compris), commande par lien (SHEIN, AliExpress…)
avec estimation instantanée et devis de l'équipe, panier, choix livraison (point relais, domicile,
express activable), paiement Mobile Money (simulé), suivi en 7 étapes, notifications,
avis vérifiés, réclamations (remboursement / avoir / renvoi), parrainage, assistant FAQ.

**Back-office** : tableau de bord des KPIs du business plan (commandes/mois, marge nette moyenne,
délai, taux de réclamation, commandes répétées, seuil de rentabilité), commandes, demandes par lien,
achats fournisseur groupés par lots (option A SHEIN manuel, option B API dropship), transit &
douane (expéditions groupées, répartition des coûts réels), livraison locale (livreurs, points
relais), clients, réclamations, modération des avis, journal et modèles de notifications,
catalogue, partenaires, roadmap 0-90 jours, registre des risques, expansion, paramètres de prix
avec simulateur, équipe et rôles.

## Points à raccorder plus tard

- Paiement Mobile Money : `src/pages/public/Checkout.tsx` (écran `Payment`) et
  `simulatePayment` dans `src/lib/store.ts` → remplacer par l'appel à l'agrégateur + webhook.
- Notifications WhatsApp / SMS / e-mail : `notify` dans `src/lib/store.ts` (aujourd'hui journalisées
  « simulées » ; bouton WhatsApp manuel dans le back-office).
- API dropship (option B) : bouton « Commande automatique » dans `src/pages/admin/Operations.tsx`.
- Base de données : l'état est conservé dans le navigateur (`localStorage`) pour la démo.
  `src/lib/store.ts` centralise toutes les actions, ce qui facilite le passage à une vraie base
  (Supabase par exemple).

Stack : React 19, TypeScript, Vite, Tailwind CSS, Zustand.
