import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Pages/Login/Login';
import Inicio from './Pages/Inicio/Inicio';
import Liquidaciones from './Pages/Liquidaciones/Liquidaciones';
import LuzFuerza from './Components/ModalLiquidaciones/Luz-Fuerza/LuzFuerza';
import Uocra from './Components/ModalLiquidaciones/Uocra/Uocra';
import PanelDeControl from './Pages/PanelDeControl/PanelDeControl';
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
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/Luz y fuerza" element={<Liquidaciones />} />
        <Route path="/Uocra" element={<Liquidaciones />} />
        <Route path="/Historial" element={<Liquidaciones />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/PanelDeControl" element={<PanelDeControl/>} />
                
      </Routes>
      <LuzFuerza onSubmit={handleSubmitLuzFuerza} />
      <Uocra onSubmit={handleSubmitUocra} />
    </Router>
  );
}

export default App;