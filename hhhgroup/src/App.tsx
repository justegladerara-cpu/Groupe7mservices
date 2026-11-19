import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'
import Home from './pages/public/Home'
import { Catalogue, ProductDetail } from './pages/public/Catalogue'
import LinkOrder from './pages/public/LinkOrder'
import { Cart, Checkout, Payment } from './pages/public/Checkout'
import { Tracking, HowItWorks, Faq, ReviewsPage, Login } from './pages/public/Info'
import { AccountLayout, MyOrders, MyOrderDetail, MyNotifications, MyClaims, Referral, Profile } from './pages/public/Account'
import Dashboard from './pages/admin/Dashboard'
import { OrdersList, OrderAdmin, LinkRequests } from './pages/admin/Orders'
import { Purchasing, Shipments, Deliveries } from './pages/admin/Operations'
import { Customers, Claims, ReviewsAdmin, NotificationsAdmin } from './pages/admin/CustomerCare'
import { CatalogueAdmin, Partners } from './pages/admin/Config'
import { Pilotage, SettingsPage } from './pages/admin/Pilotage'
import { useCurrentUser } from './lib/store'

function RequireClient({ children }: { children: React.ReactNode }) {
  const u = useCurrentUser()
  if (!u) return <Navigate to={`/connexion?next=${encodeURIComponent(window.location.hash.slice(1) || '/')}`} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="produit/:id" element={<ProductDetail />} />
          <Route path="lien" element={<LinkOrder />} />
          <Route path="panier" element={<Cart />} />
          <Route path="commande" element={<RequireClient><Checkout /></RequireClient>} />
          <Route path="paiement/:id" element={<RequireClient><Payment /></RequireClient>} />
          <Route path="suivi" element={<Tracking />} />
          <Route path="comment-ca-marche" element={<HowItWorks />} />
          <Route path="faq" element={<Faq />} />
          <Route path="avis" element={<ReviewsPage />} />
          <Route path="connexion" element={<Login />} />
          <Route path="compte" element={<AccountLayout />}>
            <Route index element={<MyOrders />} />
            <Route path="commandes/:id" element={<MyOrderDetail />} />
            <Route path="notifications" element={<MyNotifications />} />
            <Route path="reclamations" element={<MyClaims />} />
            <Route path="parrainage" element={<Referral />} />
            <Route path="profil" element={<Profile />} />
          </Route>
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="commandes" element={<OrdersList />} />
          <Route path="commandes/:id" element={<OrderAdmin />} />
          <Route path="liens" element={<LinkRequests />} />
          <Route path="achats" element={<Purchasing />} />
          <Route path="expeditions" element={<Shipments />} />
          <Route path="livraisons" element={<Deliveries />} />
          <Route path="clients" element={<Customers />} />
          <Route path="reclamations" element={<Claims />} />
          <Route path="avis" element={<ReviewsAdmin />} />
          <Route path="notifications" element={<NotificationsAdmin />} />
          <Route path="catalogue" element={<CatalogueAdmin />} />
          <Route path="partenaires" element={<Partners />} />
          <Route path="pilotage" element={<Pilotage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
