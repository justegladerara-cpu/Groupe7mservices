# Groupe7M services · Tableau de bord

Application web pour savoir **où va l'argent** de Groupe7M services : toutes les dépenses avec leur reçu, ce qui reste à payer chaque mois, le suivi de la CNSS mois par mois et les autorisations avec leurs dates de validité.

> Ce dépôt ne contient **aucune donnée réelle** (paie, déclarations, numéros CNSS). Les données vivent seulement dans la base Supabase de Groupe7M.

## Écrans

| Écran | À quoi il sert |
|---|---|
| **Accueil** | Total sorti du mois et comparaison avec le mois précédent, reste à payer, retards, papiers à renouveler, répartition (agents, État, bureau, terrain, assurances) et une tuile par poste avec un conseil. |
| **Dépenses** | Liste des sorties d'argent du mois, avec le reçu attaché. Bouton « + Dépense » : le poste, le montant, la photo du reçu. |
| **À payer** | Les échéances du mois (loyer, électricité, internet, CNSS, TUS, IRPP, TOL, assurances…) et les impayés des mois précédents. |
| **CNSS** | Chaque mois : déclaré ou non, montant, accusé de réception, payé ou non. Contrôle automatique (24,28 % du brut, mois écrit sur l'accusé, agents sans numéro CNSS). |
| **Papiers** | Agrément, RCCM, NIU, patente, attestations, assurances, bail… avec feu vert / orange / rouge et rappel avant l'expiration. |
| **Réglages** | Postes de dépense : montant habituel, date de paiement, fréquence. |

## Essayer sans base

```bash
npm install
npm run dev
```

Sans fichier `.env`, l'application s'ouvre en **démonstration** avec des chiffres inventés (rien n'est enregistré).

## Mise en ligne

### 1. Base Supabase (une fois)

1. Dans le projet Supabase de Groupe7M, ouvrir **SQL Editor** et exécuter `supabase/migrations/20261027000001_groupe7m.sql` (le fichier peut être relancé sans risque).
2. **Authentication › Users › Add user** : créer le compte du gérant (e-mail + mot de passe).
3. L'autoriser :
   ```sql
   insert into public.g7_membres (email, nom, role) values ('email-du-gerant@exemple.com', 'Nom du gérant', 'gerant');
   ```
   Rôles : `gerant` (tout), `saisie` (ajoute et modifie, ne supprime pas), `lecteur` (lecture seule).
4. **Authentication › URL Configuration** : mettre l'adresse du site dans *Site URL* (pour « Mot de passe oublié »).

### 2. Site (GitHub Pages)

- En ligne : chaque fusion dans `main` construit le site et le publie dans la branche `gh-pages` (GitHub Pages), voir `.github/workflows/pages.yml`.
- L'adresse et la clé publique Supabase sont dans ce workflow (la clé publique n'est pas un secret : les données sont protégées par les règles de la base).

## Règles de calcul

- **Échéances** : chaque poste régulier crée une échéance par période (mensuelle, trimestrielle, semestrielle, annuelle), au jour choisi, le mois même ou le mois suivant (CNSS, TUS, IRPP, TOL : le 20 du mois suivant par défaut, **à confirmer avec le comptable**). Une dépense enregistrée « pour » ce mois la marque payée.
- **CNSS** : 24,28 % du brut, soit pensions 12 % (8 % employeur + 4 % salarié), prestations familiales 10,03 %, risques professionnels 2,25 %, comme sur les accusés de la CNSS. Les plafonds éventuels ne sont pas appliqués. Le suivi commence au mois de la plus ancienne déclaration saisie.
- **Papiers** : orange à partir de 60 jours avant la fin (réglable), rouge une fois expiré.

## Développement

```bash
npm test        # règles de calcul (vitest)
npm run build   # version de production dans dist/
```

Code : `src/lib/regles.js` (calculs, testés), `src/lib/vue.js` (chiffres du mois), `src/lib/api.js` (base), `src/lib/demo.js` (démonstration), `src/ecrans/` (écrans).
