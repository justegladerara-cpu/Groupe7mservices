import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Chemins relatifs : le site marche à la racine d'un domaine comme dans un sous-dossier (GitHub Pages).
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
