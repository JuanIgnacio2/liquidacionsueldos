import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';
import Sidebar from './Components/ui/sidebar';
import Dashboard from './Pages/Dashboard';
import Liquidacion from './Pages/Liquidacion';
import Convenios from './Pages/Convenios';
import NotFound from './Pages/NotFound';
import Empleados from './Pages/Empleados';
import HistorialPagos from './Pages/HistorialPagos';
import Reportes from './Pages/Reportes';
import Login from './Pages/Login';
import './styles/main.scss';
import ConvenioDetail from './Pages/ConvenioDetail';
import { NotificationSystem } from './Components/NotificationSystem/NotificationSystem';
import { ConfirmDialog } from './Components/ConfirmDialog/ConfirmDialog';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública de login */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas protegidas */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/empleados" element={<Empleados />} />
                      <Route path="/convenios" element={<Convenios/>}/>
                      <Route path="/convenios/:controller" element={<ConvenioDetail/>}/>
                      <Route path="/liquidacion" element={<Liquidacion/>}/>
                      <Route path="/historial-pagos" element={<HistorialPagos/>}/>
                      <Route path="/reportes" element={<Reportes/>}/>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <NotificationSystem />
                  <ConfirmDialog />
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;