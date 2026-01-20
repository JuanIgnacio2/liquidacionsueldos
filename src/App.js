import React from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Components/ui/sidebar';
import Dashboard from './Pages/Dashboard';
import Liquidacion from './Pages/Liquidacion';
import Convenios from './Pages/Convenios';
import NotFound from './Pages/NotFound';
import Empleados from './Pages/Empleados';
import HistorialPagos from './Pages/HistorialPagos';
import Resumenes from './Pages/Resumenes';
import Login from './Pages/Login';
import WaitingAuthorization from './Pages/WaitingAuthorization';
import './styles/main.scss';
import ConvenioDetail from './Pages/ConvenioDetail';
import { NotificationSystem } from './Components/NotificationSystem/NotificationSystem';
import { ConfirmDialog } from './Components/ConfirmDialog/ConfirmDialog';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';
import Configuracion from './Pages/Configuracion';
import { AntiguedadUpdater } from './Components/AntiguedadUpdater/AntiguedadUpdater';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/espera-autorizacion" element={
        <ProtectedRoute>
          <WaitingAuthorization />
        </ProtectedRoute>
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
          <Resumenes />
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
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  
  // Verificar si el usuario es NEW_USER o está en la página de espera
  const userRole = user?.userRol || user?.rol || user?.role || user?.rolUsuario;
  const isWaitingPage = location.pathname === '/espera-autorizacion';
  const isNewUser = userRole === 'NEW_USER';

  if (!isAuthenticated) {
    return (
      <>
        <AppRoutes />
        <NotificationSystem />
        <ConfirmDialog />
      </>
    );
  }

  // Si está en la página de espera o es NEW_USER, no mostrar sidebar
  if (isWaitingPage || isNewUser) {
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
      <AntiguedadUpdater />
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