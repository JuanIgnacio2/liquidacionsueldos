import { useEffect, useState } from "react";
import * as api from "../services/empleadosAPI";
import EmployeeModal from "../Components/EmployeeModal/EmployeeModal";
import { AnimatePresence } from "framer-motion";
import { Button } from "../Components/ui/button";
import { Card } from "../Components/ui/card";
import { Input } from "../Components/ui/input";

function Empleados() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees();
      setEmployees(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    setFiltered(
      employees.filter(
        (e) =>
          e.legajo.toString().includes(search) ||
          `${e.nombre} ${e.apellido}`.toLowerCase().includes(lower)
      )
    );
  }, [search, employees]);

  const handleSave = async (dto, isEdit) => {
    try {
      if (isEdit) {
        await api.updateEmployee(dto.legajo, dto);
      } else {
        await api.createEmployee(dto);
      }
      await loadEmployees(); // Refresh list
      setModalOpen(false);
    } catch (err) {
      alert("Error al registrar empleado: " + err.message);
    }
  };

  return (
    <div className="container py-4">
      <Card>
        <div className="card-header flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Empleados</h2>
          <div className="flex space-x-3">
            <Input
              type="text"
              placeholder="Buscar por legajo o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
            <Button variant="default" onClick={() => { setCurrent(null); setModalOpen(true); }}>
              + Nuevo
            </Button>
          </div>
        </div>

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full border rounded">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">Legajo</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">CUIL</th>
                  <th className="p-2">Inicio actividad</th>
                  <th className="p-2">Domicilio</th>
                  <th className="p-2">Banco</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Gremio</th>
                  <th className="p-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.legajo}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => { setCurrent(e); setModalOpen(true); }}
                  >
                    <td className="p-2">{e.legajo}</td>
                    <td className="p-2">{`${e.nombre} ${e.apellido}`}</td>
                    <td className="p-2">{e.cuil}</td>
                    <td className="p-2">{e.inicioActividad}</td>
                    <td className="p-2">{e.domicilio}</td>
                    <td className="p-2">{e.banco}</td>
                    <td className="p-2">{e.categoria}</td>
                    <td className="p-2">
                      {e.gremio === "LUZ_Y_FUERZA" ? "Luz y Fuerza" : e.gremio}
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setCurrent(e);
                          setModalOpen(true);
                        }}
                      >
                        ✏️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AnimatePresence mode="wait">
        {modalOpen && (
          <EmployeeModal
            initialData={current}
            onClose={() => {
              setModalOpen(false);
              setCurrent(null);
            }}
            onSubmit={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Empleados;
