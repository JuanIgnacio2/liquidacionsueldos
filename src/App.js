import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Sidebar from './Components/ui/sidebar';
import Dashboard from './Pages/Dashboard';
import Liquidacion from './Pages/Liquidacion';
import Convenios from './Pages/Convenios';
import NotFound from './Pages/NotFound';
import Empleados from './Pages/Empleados';
import HistorialPagos from './Pages/HistorialPagos';
import Reportes from './Pages/Reportes';
import Login from './Pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';
import Configuracion from './Pages/Configuracion';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/empleados" element={
        <ProtectedRoute>
          <Empleados />
        </ProtectedRoute>
      } />
      <Route path="/convenios" element={
        <ProtectedRoute>
          <Convenios />
        </ProtectedRoute>
      } />
      <Route path="/convenios/:controller" element={
        <ProtectedRoute>
          <ConvenioDetail />
        </ProtectedRoute>
      } />
      <Route path="/liquidacion" element={
        <ProtectedRoute>
          <Liquidacion />
        </ProtectedRoute>
      } />
      <Route path="/historial-pagos" element={
        <ProtectedRoute>
          <HistorialPagos />
        </ProtectedRoute>
      } />
      <Route path="/reportes" element={
        <ProtectedRoute>
          <Reportes />
        </ProtectedRoute>
      } />
      <Route path="/configuracion" element={
        <ProtectedRoute>
          <Configuracion />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <>
        <AppRoutes />
        <NotificationSystem />
        <ConfirmDialog />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <AppRoutes />
      </main>
      <NotificationSystem />
      <ConfirmDialog />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;