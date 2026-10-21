/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer partage le React 18 du projet : la génération PDF
  // côté serveur fonctionne avec une instance unique de React (Next 14 +
  // React 18). Aucune externalisation ni alias nécessaire.
}

export default nextConfig
