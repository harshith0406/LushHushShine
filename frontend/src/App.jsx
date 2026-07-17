import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import ProtectedRoutes from './components/ProtectedRoutes';
import DashboardLayout from './components/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import SellingPlaceDashboard from './pages/SellingPlaceDashboard';
import VendorDashboard from './pages/VendorDashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import PurchaseOrders from './pages/PurchaseOrders';
import Profile from './pages/Profile';

/**
 * Root Route Selector
 * Inspects user role and serves the corresponding dashboard
 */
const HomeSelector = () => {
  const { user } = useAuth();
  if (user?.role === 'Selling Place') {
    return <SellingPlaceDashboard />;
  } else if (user?.role === 'Vendor') {
    return <VendorDashboard />;
  }
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Business routes */}
          <Route element={<ProtectedRoutes />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<HomeSelector />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Fallback Catch All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
