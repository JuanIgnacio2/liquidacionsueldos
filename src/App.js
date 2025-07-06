import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Pages/Login/Login';
import Inicio from './Pages/Inicio/Inicio';
import Liquidaciones from './Pages/Liquidaciones/Liquidaciones';
import HistorialPagos from './Pages/HistorialPagos/HistorialPagos';
import PanelDeControl from './Pages/PanelDeControl/PanelDeControl';
import Employees from './Pages/Employees/Employees';
import Convenios from './Pages/Convenios/Convenios';
import './App.css';

function App() {
  const handleSubmitLuzFuerza = (data) => {
    console.log('Datos Luz y Fuerza:', data);
  };

  const handleSubmitUocra = (data) => {
    console.log('Datos UOCRA:', data);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/Luz y fuerza" element={<Liquidaciones />} />
        <Route path="/Uocra" element={<Liquidaciones />} />
        <Route path="/historial" element={<HistorialPagos />} />
        <Route path="/empleados" element={<Employees />} />
        <Route path="/convenios" element={<Convenios/>}/>
        <Route path="/PanelDeControl" element={<PanelDeControl/>} />      
      </Routes>
    </Router>
  );
}

export default App;