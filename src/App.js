import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './Components/ui/sidebar';
import Dashboard from './Pages/Dashboard';
import Liquidacion from './Pages/Liquidacion';
import Convenios from './Pages/Convenios';
import NotFound from './Pages/NotFound';
import Empleados from './Pages/Empleados';
import './styles/main.scss';

function App() {
  return (
    <BrowserRouter>
       <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/empleados" element={<Empleados />} />
              <Route path="/convenios" element={<Convenios/>}/>
              <Route path="/liquidacion" element={<Liquidacion/>}/>
              <Route path="*" element={<NotFound />} />
            </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;