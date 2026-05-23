import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import UserMainMap from './features/map/pages/UserMainMap'
import ArCatchPage from './features/catch/pages/ArCatchPage'
import InventoryPage from './features/inventory/pages/InventoryPage'
import MerchantDashboard from './features/merchant/pages/MerchantDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<UserMainMap />} />
          <Route path="/catch" element={<ArCatchPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/merchant" element={<MerchantDashboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
