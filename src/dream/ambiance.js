// Ambiance reprise de The Dream, aux couleurs du logo Groupe7M (bleu marine et orange).
// Les jetons sont posés directement sur <html> (comme la couleur de marque), donc ils passent avant le thème
// clair ou sombre de l'appareil. Quitter l'ambiance retire tout : les autres établissements ne voient rien.

export const PALETTES = {
  // Couleurs du logo Groupe7M : bleu marine #09335B et orange #FE4F00.
  nuit: {
    '--fond': '#061A2E',
    '--surface': '#0B2540',
    '--surface-douce': '#0D2A48',
    '--surface-survol': '#123358',
    '--bordure': '#17385C',
    '--bordure-forte': '#23507F',
    '--bordure-champ': '#4A7099',
    '--texte': '#F2F5F9',
    '--texte-doux': '#B9C6D4',
    '--texte-faible': '#93A5B9',
    '--accent': '#FF5A0F',
    '--accent-fort': '#E04A00',
    '--accent-doux': '#3A1E10',
    '--bleu-doux': '#123358',
    '--accent-2': '#FF8A4C',
    '--accent-3': '#C43F00',
    '--vert': '#2FBF71',
    '--vert-doux': '#0F2E24',
    '--orange': '#F5B23B',
    '--orange-doux': '#33280F',
    '--rouge': '#F0565B',
    '--rouge-doux': '#3A1620',
    '--menu': '#051627',
    '--menu-texte': '#B9C6D4',
    '--menu-titre': '#8194AA',
    '--menu-survol': '#0B2540',
    '--menu-actif': '#3A1E10',
    '--menu-bordure': '#0F2A45',
    '--menu-fort': '#F2F5F9',
    '--menu-fort-actif': '#FF8A4C',
    '--sur-or': '#061A2E',
    '--anneau': 'rgba(255, 90, 15, 0.16)',
    '--anneau-fort': 'rgba(255, 90, 15, 0.30)',
    '--ombre': '0 1px 2px rgba(0, 0, 0, 0.45)',
    '--ombre-carte': '0 0 0 1px rgba(120, 160, 210, 0.14), 0 8px 24px -10px rgba(0, 0, 0, 0.6)',
    '--ombre-survol': '0 0 0 1px rgba(255, 90, 15, 0.35), 0 18px 36px -14px rgba(0, 0, 0, 0.7)',
    '--ombre-bouton': '0 0 0 1px rgba(255, 90, 15, 0.25), 0 2px 6px -2px rgba(0, 0, 0, 0.5)',
    '--ombre-forte': '0 18px 40px rgba(0, 0, 0, 0.6)',
  },
  jour: {
    '--fond': '#F3F6FA',
    '--surface': '#FFFFFF',
    '--surface-douce': '#F7F9FC',
    '--surface-survol': '#EDF2F8',
    '--bordure': '#DCE4EE',
    '--bordure-forte': '#C3D0DF',
    '--bordure-champ': '#6B83A0',
    '--texte': '#09223D',
    '--texte-doux': '#4A5E76',
    '--texte-faible': '#5E7189',
    '--accent': '#D94700',
    '--accent-fort': '#B33A00',
    '--accent-doux': '#FFEDE3',
    '--bleu-doux': '#E6EEF7',
    '--accent-2': '#FE4F00',
    '--accent-3': '#09335B',
    '--vert': '#1F8A52',
    '--vert-doux': '#E3F4EA',
    '--orange': '#B86E0B',
    '--orange-doux': '#FCF0DC',
    '--rouge': '#C42F34',
    '--rouge-doux': '#FBE6E6',
    '--menu': '#09335B',
    '--menu-texte': '#C9D6E4',
    '--menu-titre': '#8FA6BF',
    '--menu-survol': '#0D3D6B',
    '--menu-actif': '#11477C',
    '--menu-bordure': '#0B2C4E',
    '--menu-fort': '#FFFFFF',
    '--menu-fort-actif': '#FF8A4C',
    '--sur-or': '#FFFFFF',
    '--anneau': 'rgba(9, 51, 91, 0.14)',
    '--anneau-fort': 'rgba(217, 71, 0, 0.30)',
    '--ombre': '0 1px 2px rgba(9, 34, 61, 0.06)',
    '--ombre-carte': '0 0 0 1px rgba(9, 51, 91, 0.08), 0 8px 22px -10px rgba(9, 34, 61, 0.18)',
    '--ombre-survol': '0 0 0 1px rgba(217, 71, 0, 0.30), 0 18px 34px -14px rgba(9, 34, 61, 0.26)',
    '--ombre-bouton': '0 0 0 1px rgba(217, 71, 0, 0.24), 0 2px 5px -2px rgba(9, 34, 61, 0.18)',
    '--ombre-forte': '0 18px 40px rgba(9, 34, 61, 0.22)',
  },
};

// Dégradé or : champagne → or → bronze, avec le même nom que le dégradé de marque du reste du logiciel.
const DEGRADE = 'linear-gradient(135deg, #FF8A4C 0%, #FE4F00 50%, #D94000 100%)';

// Polices au choix (Paramètres > Apparence) : titres, textes, chiffres. Toutes viennent de Google Fonts ; « Système »
// garde la police de l'appareil (rien à télécharger, le plus rapide sur une connexion lente).
export const POLICES = {
  titre: ['Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Cinzel', 'Lora', 'Montserrat', 'Poppins', 'Oswald', 'Bebas Neue', 'Inter'],
  texte: ['Inter', 'Poppins', 'Montserrat', 'Nunito', 'Lato', 'Open Sans', 'Roboto', 'Source Sans 3', 'DM Sans', 'Système'],
  chiffres: ['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Space Grotesk', 'Oswald', 'Roboto Mono', 'JetBrains Mono', 'Playfair Display', 'Système'],
};
export const POLICES_DEFAUT = { titre: 'Montserrat', texte: 'Inter', chiffres: 'Inter' };
export const TAILLES_TEXTE = { normal: 1, grand: 1.12, 'tres-grand': 1.25 };
const TAILLES_BASE = { '--texte-xs': 12, '--texte-sm': 13, '--texte-base': 14, '--texte-md': 15, '--texte-lg': 17, '--texte-xl': 20 };
const SECOURS = { titre: 'Georgia, serif', texte: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", chiffres: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" };
const SERIF = new Set(['Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Cinzel', 'Lora']);

// Un nom de police tapé à la main : lettres, chiffres et espaces seulement (rien d'autre n'entre dans le lien).
export function nomPoliceValide(nom) {
  return typeof nom === 'string' && /^[A-Za-zÀ-ÿ0-9 ]{2,40}$/.test(nom.trim());
}

export function policesDe(apparence) {
  const choix = apparence?.polices ?? {};
  const res = {};
  for (const cle of Object.keys(POLICES_DEFAUT)) res[cle] = nomPoliceValide(choix[cle]) ? choix[cle].trim() : POLICES_DEFAUT[cle];
  return res;
}

export function pilePolice(nom, role) {
  if (nom === 'Système') return SECOURS[role];
  const secours = SERIF.has(nom) ? 'Georgia, serif' : SECOURS[role];
  return `'${nom}', ${secours}`;
}

// Lien Google Fonts d'une police. Avec les graisses 400 à 700 ; « simple » = sans graisse (pour une police qui n'a
// qu'une graisse, comme Bebas Neue : Google refuse sinon le lien entier).
export function lienPolice(nom, simple = false) {
  if (!nom || nom === 'Système') return null;
  const famille = nom.trim().replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${famille}${simple ? '' : ':wght@400;500;600;700'}&display=swap`;
}

const CLES = [...new Set([...Object.keys(PALETTES.nuit), ...Object.keys(PALETTES.jour), '--degrade-marque', '--police-titre', '--police', '--police-chiffres', ...Object.keys(TAILLES_BASE)])];

// Réglages lus dans Paramètres > Apparence (module etablissement, clé apparence).
export function ambianceDe(reglages) {
  const etab = reglages?.etablissement ?? {};
  if (etab.nouvelle_version !== true) return null;
  const apparence = etab.apparence ?? {};
  if ((apparence.theme ?? 'dream') !== 'dream') return null;
  const mode = ['nuit', 'jour', 'auto'].includes(apparence.mode) ? apparence.mode : 'nuit';
  const taille = Object.hasOwn(TAILLES_TEXTE, apparence.taille_texte) ? apparence.taille_texte : 'normal';
  return { theme: 'dream', mode, animations: apparence.animations !== false, polices: policesDe(apparence), taille };
}

function modeEffectif(mode) {
  if (mode !== 'auto') return mode;
  // « Auto » : la nuit dès 18 h (le bar ouvre le soir), le jour le matin.
  const h = new Date().getHours();
  return h >= 18 || h < 7 ? 'nuit' : 'jour';
}

// Un lien par police choisie (seules celles-là sont téléchargées) ; les liens des polices quittées sont retirés.
export function chargerPolices(noms) {
  if (typeof document === 'undefined') return;
  const voulus = [...new Set(noms.filter((n) => n && n !== 'Système'))];
  const presents = [...document.querySelectorAll('link[data-police-dream]')];
  presents.forEach((l) => { if (!voulus.includes(l.dataset.policeDream)) l.remove(); });
  voulus.forEach((nom) => {
    if (presents.some((l) => l.dataset.policeDream === nom && l.isConnected)) return;
    const lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.dataset.policeDream = nom;
    lien.href = lienPolice(nom);
    lien.addEventListener('error', () => { if (!lien.dataset.simple) { lien.dataset.simple = '1'; lien.href = lienPolice(nom, true); } });
    document.head.appendChild(lien);
  });
}

export function appliquerAmbiance(ambiance, racine = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!racine) return;
  if (!ambiance) {
    if (racine.dataset.ambiance) {
      CLES.forEach((cle) => racine.style.removeProperty(cle));
      delete racine.dataset.ambiance;
      delete racine.dataset.dream;
    }
    return;
  }
  const mode = modeEffectif(ambiance.mode);
  const palette = PALETTES[mode];
  Object.entries(palette).forEach(([cle, valeur]) => racine.style.setProperty(cle, valeur));
  racine.style.setProperty('--degrade-marque', DEGRADE);
  const polices = ambiance.polices ?? POLICES_DEFAUT;
  racine.style.setProperty('--police-titre', pilePolice(polices.titre, 'titre'));
  racine.style.setProperty('--police', pilePolice(polices.texte, 'texte'));
  racine.style.setProperty('--police-chiffres', pilePolice(polices.chiffres, 'chiffres'));
  const facteur = TAILLES_TEXTE[ambiance.taille] ?? 1;
  Object.entries(TAILLES_BASE).forEach(([cle, px]) => {
    if (facteur === 1) racine.style.removeProperty(cle);
    else racine.style.setProperty(cle, `${Math.round(px * facteur)}px`);
  });
  racine.dataset.ambiance = 'dream';
  racine.dataset.dream = mode;
  if (typeof document !== 'undefined') {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'nuit' ? '#061A2E' : '#09335B');
    chargerPolices(Object.values(polices));
  }
}
