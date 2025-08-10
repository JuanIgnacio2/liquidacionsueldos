import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
//import Login from './Pages/Login/Login';
import {SidebarLayout} from './Components/ui/sidebar-layout';
import Dashboard from './Pages/Dashboard';
import Liquidaciones from './Pages/Liquidaciones';
//import HistorialPagos from './Pages/HistorialPagos/HistorialPagos';
//import PanelDeControl from './Pages/PanelDeControl/PanelDeControl';
//import Employees from './Pages/Employees/Employees';
import Convenios from './Pages/Convenios';
import NotFound from './Pages/NotFound';
import Empleados from './Pages/Empleados';
import './styles/App.scss';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/convenios" element={<Convenios />} />
            <Route path="/liquidaciones" element={<Liquidaciones />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SidebarLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;