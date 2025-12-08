import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Calendar, ChevronLeft, DollarSign, Filter, Printer, Users } from 'lucide-react';
import { MonthDetailModal } from '../HistorialPagos/HistorialPagos';
import { PrintReportDialog } from '../HistorialPagos/ImprimirHistorial';
import '../../PlaceHolder.scss';
import './LiquidacionHistorial.scss';

const payrollEmployeeDetails = [
  {
    id: '2024-02-utedyc-001',
    employeeName: 'Mariana López',
    document: '27-24567890-3',
    position: 'Analista Sr.',
    department: 'Administración',
    union: 'UTEDYC',
    month: '2024-02',
    status: 'Procesada',
    basicSalary: 185000,
    bonuses: 42000,
    deductions: 9800,
    netSalary: 217200,
    paymentDate: '2024-02-05',
    generatedAt: '2024-02-02'
  },
  {
    id: '2024-02-utedyc-002',
    employeeName: 'Carlos Pérez',
    document: '20-21458796-7',
    position: 'Supervisor',
    department: 'Operaciones',
    union: 'UTEDYC',
    month: '2024-02',
    status: 'Procesada',
    basicSalary: 178000,
    bonuses: 36000,
    deductions: 10400,
    netSalary: 203600,
    paymentDate: '2024-02-05',
    generatedAt: '2024-02-02'
  },
  {
    id: '2024-02-foetra-001',
    employeeName: 'Laura Benítez',
    document: '27-29654120-3',
    position: 'Coordinadora',
    department: 'Soporte Técnico',
    union: 'FOETRA',
    month: '2024-02',
    status: 'Procesada',
    basicSalary: 170000,
    bonuses: 28000,
    deductions: 6500,
    netSalary: 191500,
    paymentDate: '2024-02-08',
    generatedAt: '2024-02-01'
  },
  {
    id: '2024-02-foetra-002',
    employeeName: 'Matías Herrera',
    document: '20-23659874-1',
    position: 'Especialista Redes',
    department: 'Infraestructura',
    union: 'FOETRA',
    month: '2024-02',
    status: 'Procesada',
    basicSalary: 164000,
    bonuses: 26000,
    deductions: 7200,
    netSalary: 182800,
    paymentDate: '2024-02-08',
    generatedAt: '2024-02-01'
  },
  {
    id: '2024-02-foetra-003',
    employeeName: 'Adriana Núñez',
    document: '27-25498763-8',
    position: 'Analista Comercial',
    department: 'Comercial',
    union: 'FOETRA',
    month: '2024-02',
    status: 'Procesada',
    basicSalary: 158000,
    bonuses: 24500,
    deductions: 6800,
    netSalary: 176700,
    paymentDate: '2024-02-08',
    generatedAt: '2024-02-01'
  },
  {
    id: '2024-01-utedyc-001',
    employeeName: 'Mariana López',
    document: '27-24567890-3',
    position: 'Analista Sr.',
    department: 'Administración',
    union: 'UTEDYC',
    month: '2024-01',
    status: 'Procesada',
    basicSalary: 182000,
    bonuses: 38000,
    deductions: 9500,
    netSalary: 210500,
    paymentDate: '2024-01-05',
    generatedAt: '2024-01-03'
  },
  {
    id: '2024-01-smata-002',
    employeeName: 'Verónica Sosa',
    document: '27-24879632-6',
    position: 'Planificadora',
    department: 'Producción',
    union: 'SMATA',
    month: '2024-01',
    status: 'Procesada',
    basicSalary: 179000,
    bonuses: 38500,
    deductions: 10900,
    netSalary: 206600,
    paymentDate: '2024-01-07',
    generatedAt: '2024-01-03'
  },
  {
    id: '2024-01-smata-003',
    employeeName: 'Hernán Cabrera',
    document: '20-28563497-2',
    position: 'Inspector',
    department: 'Calidad',
    union: 'SMATA',
    month: '2024-01',
    status: 'Procesada',
    basicSalary: 166000,
    bonuses: 27000,
    deductions: 7300,
    netSalary: 185700,
    paymentDate: '2024-01-07',
    generatedAt: '2024-01-03'
  },
  {
    id: '2024-01-foetra-001',
    employeeName: 'Laura Benítez',
    document: '27-29654120-3',
    position: 'Coordinadora',
    department: 'Soporte Técnico',
    union: 'FOETRA',
    month: '2024-01',
    status: 'Procesada',
    basicSalary: 167000,
    bonuses: 26000,
    deductions: 6400,
    netSalary: 186600,
    paymentDate: '2024-01-09',
    generatedAt: '2024-01-02'
  },
  {
    id: '2024-01-foetra-002',
    employeeName: 'Matías Herrera',
    document: '20-23659874-1',
    position: 'Especialista Redes',
    department: 'Infraestructura',
    union: 'FOETRA',
    month: '2024-01',
    status: 'Procesada',
    basicSalary: 162000,
    bonuses: 24000,
    deductions: 7000,
    netSalary: 179000,
    paymentDate: '2024-01-09',
    generatedAt: '2024-01-02'
  },
  {
    id: '2024-01-foetra-003',
    employeeName: 'Adriana Núñez',
    document: '27-25498763-8',
    position: 'Analista Comercial',
    department: 'Comercial',
    union: 'FOETRA',
    month: '2024-01',
    status: 'Procesada',
    basicSalary: 155000,
    bonuses: 21000,
    deductions: 6600,
    netSalary: 169400,
    paymentDate: '2024-01-09',
    generatedAt: '2024-01-02'
  },
  {
    id: '2023-12-utedyc-001',
    employeeName: 'Mariana López',
    document: '27-24567890-3',
    position: 'Analista Sr.',
    department: 'Administración',
    union: 'UTEDYC',
    month: '2023-12',
    status: 'Procesada',
    basicSalary: 179000,
    bonuses: 36000,
    deductions: 9300,
    netSalary: 205700,
    paymentDate: '2023-12-07',
    generatedAt: '2023-12-04'
  },
  {
    id: '2023-12-utedyc-002',
    employeeName: 'Carlos Pérez',
    document: '20-21458796-7',
    position: 'Supervisor',
    department: 'Operaciones',
    union: 'UTEDYC',
    month: '2023-12',
    status: 'Procesada',
    basicSalary: 173000,
    bonuses: 32000,
    deductions: 9800,
    netSalary: 195200,
    paymentDate: '2023-12-07',
    generatedAt: '2023-12-04'
  },
  {
    id: '2023-12-utedyc-003',
    employeeName: 'Lucía Bianchi',
    document: '27-30569874-5',
    position: 'Especialista',
    department: 'Legales',
    union: 'UTEDYC',
    month: '2023-12',
    status: 'Procesada',
    basicSalary: 185000,
    bonuses: 25000,
    deductions: 9000,
    netSalary: 201000,
    paymentDate: '2023-12-07',
    generatedAt: '2023-12-04'
  },

];

const monthLabelFormatter = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: 'long'
});

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

const formatMonthName = (month) => {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  const formatted = monthLabelFormatter.format(date);
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`.replace(' de ', ' ');
};

const formatCurrency = (value) => currencyFormatter.format(value);

const payrollHistory = Object.values(
  payrollEmployeeDetails.reduce((accumulator, entry) => {
    const key = `${entry.month}-${entry.union}`;

    if (!accumulator[key]) {
      accumulator[key] = {
        id: key,
        month: entry.month,
        monthName: formatMonthName(entry.month),
        union: entry.union,
        totalEmployees: 0,
        totalNet: 0,
        generatedAt: entry.generatedAt,
        paymentWindow: entry.paymentDate
      };
    }

    accumulator[key].totalEmployees += 1;
    accumulator[key].totalNet += entry.netSalary;
    return accumulator;
  }, {})
)
  .map((record) => ({
    ...record,
    totalNet: Math.round(record.totalNet)
  }))
  .sort((a, b) => {
    if (a.month === b.month) {
      return a.union.localeCompare(b.union);
    }
    return a.month > b.month ? -1 : 1;
  });

const unionOptions = [
  { value: 'Todos', label: 'Todos los gremios' },
  ...Array.from(new Set(payrollHistory.map((record) => record.union)))
    .sort((a, b) => a.localeCompare(b))
    .map((union) => ({ value: union, label: union }))
];

const allMonthOptions = Object.freeze(
  Array.from(
    payrollHistory.reduce((map, record) => {
      if (!map.has(record.month)) {
        map.set(record.month, record.monthName);
      }
      return map;
    }, new Map())
  )
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([value, label]) => ({ value, label }))
);

export default function LiquidacionHistorial() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [selectedUnion, setSelectedUnion] = useState('Todos');
  const [activeRecord, setActiveRecord] = useState(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(payrollHistory.map((record) => record.month.slice(0, 4)))).sort((a, b) =>
      b.localeCompare(a)
    );
    return [{ value: 'Todos', label: 'Todos los años' }, ...years.map((year) => ({ value: year, label: year }))];
  }, []);

  const monthOptions = useMemo(() => {
    const months = payrollHistory.reduce((map, record) => {
      if (selectedYear !== 'Todos' && !record.month.startsWith(selectedYear)) {
        return map;
      }
      if (!map.has(record.month)) {
        map.set(record.month, record.monthName);
      }
      return map;
    }, new Map());

    return [
      { value: 'Todos', label: 'Todos los meses' },
      ...Array.from(months.entries())
        .sort((a, b) => (a[0] > b[0] ? -1 : 1))
        .map(([value, label]) => ({ value, label }))
    ];
  }, [selectedYear]);

  useEffect(() => {
    if (selectedMonth !== 'Todos' && selectedYear !== 'Todos' && !selectedMonth.startsWith(selectedYear)) {
      setSelectedMonth('Todos');
    }
  }, [selectedYear, selectedMonth]);

  const filteredRecords = useMemo(() => {
    return payrollHistory.filter((record) => {
      const matchesYear = selectedYear === 'Todos' || record.month.startsWith(selectedYear);
      const matchesMonth = selectedMonth === 'Todos' || record.month === selectedMonth;
      const matchesUnion = selectedUnion === 'Todos' || record.union === selectedUnion;
      return matchesYear && matchesMonth && matchesUnion;
    });
  }, [selectedMonth, selectedUnion, selectedYear]);

  const totals = useMemo(() => {
    const employees = filteredRecords.reduce((accumulator, record) => accumulator + record.totalEmployees, 0);
    const net = filteredRecords.reduce((accumulator, record) => accumulator + record.totalNet, 0);
    const periodCount = new Set(filteredRecords.map((record) => record.month)).size;
    return { employees, net, periodCount };
  }, [filteredRecords]);

  const unionBreakdown = useMemo(() => {
    const aggregation = filteredRecords.reduce((accumulator, record) => {
      const current = accumulator.get(record.union) || { union: record.union, employees: 0, net: 0 };
      current.employees += record.totalEmployees;
      current.net += record.totalNet;
      accumulator.set(record.union, current);
      return accumulator;
    }, new Map());

    return Array.from(aggregation.values()).sort((a, b) => a.union.localeCompare(b.union));
  }, [filteredRecords]);

  const activeEmployees = useMemo(() => {
    if (!activeRecord) {
      return [];
    }

    return payrollEmployeeDetails.filter(
      (employee) => employee.month === activeRecord.month && employee.union === activeRecord.union
    );
  }, [activeRecord]);

  const handleResetFilters = () => {
    setSelectedYear('Todos');
    setSelectedMonth('Todos');
    setSelectedUnion('Todos');
  };

  const handleOpenRecord = (record) => {
    setActiveRecord(record);
  };

  const handleCloseRecord = () => {
    setActiveRecord(null);
  };

  const handleScopedPrint = useCallback(
    ({ type, month, year }) => {
      if ((type === 'month' && !month) || (type === 'year' && !year)) {
        return;
      }

      setIsPrintDialogOpen(false);

      const previousFilters = {
        month: selectedMonth,
        year: selectedYear,
        union: selectedUnion
      };

      const revertFilters = () => {
        setSelectedYear(previousFilters.year);
        setSelectedMonth(previousFilters.month);
        setSelectedUnion(previousFilters.union);
      };

      const afterPrint = () => {
        revertFilters();
        window.removeEventListener('afterprint', afterPrint);
      };

      if (type === 'month') {
        setSelectedYear(month.slice(0, 4));
        setSelectedMonth(month);
        setSelectedUnion('Todos');
      } else {
        setSelectedYear(year);
        setSelectedMonth('Todos');
        setSelectedUnion('Todos');
      }

      window.addEventListener('afterprint', afterPrint);

      setTimeout(() => {
        window.print();
        setTimeout(revertFilters, 1000);
      }, 200);
    },
    [selectedMonth, selectedUnion, selectedYear]
  );

  return (
    <div className="placeholder-page history-page">
      <div className="page-header history-header">
        <button type="button" className="back-link" onClick={() => navigate('/liquidacion')}>
          <ChevronLeft className="back-icon" />
          <span>Volver a Liquidación</span>
        </button>
        <div className="header-content">
          <h1 className="title title-gradient">Historial de Liquidaciones</h1>
          <p className="subtitle">Accede al detalle mensual y genera reportes segmentados</p>
        </div>
        <button type="button" className="print-report-btn" onClick={() => setIsPrintDialogOpen(true)}>
          <Printer className="print-icon" />
          <span>Imprimir reporte</span>
        </button>
      </div>

      <div className="card filters-card">
        <div className="card-header">
          <h2 className="section-title section-title-effect">
            <Filter className="title-icon" />
            Filtros avanzados
          </h2>
          <p className="card-description">Selecciona los criterios para segmentar el historial</p>
        </div>
        <div className="card-content">
          <div className="filters-grid">
            <div className="filter-control">
              <label htmlFor="year-filter">Año</label>
              <select
                id="year-filter"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
              >
                {yearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-control">
              <label htmlFor="month-filter">Mes</label>
              <select
                id="month-filter"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-control">
              <label htmlFor="union-filter">Gremio</label>
              <select
                id="union-filter"
                value={selectedUnion}
                onChange={(event) => setSelectedUnion(event.target.value)}
              >
                {unionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-actions">
              <button type="button" className="reset-filters" onClick={handleResetFilters}>
                Restablecer filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="card summary-card">
          <div className="summary-icon users">
            <Users />
          </div>
          <div className="summary-details">
            <span className="summary-label">Empleados incluidos</span>
            <span className="summary-value">{totals.employees}</span>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon net">
            <DollarSign />
          </div>
          <div className="summary-details">
            <span className="summary-label">Total neto acumulado</span>
            <span className="summary-value">{formatCurrency(totals.net)}</span>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon periods">
            <Calendar />
          </div>
          <div className="summary-details">
            <span className="summary-label">Períodos analizados</span>
            <span className="summary-value">{totals.periodCount}</span>
          </div>
        </div>
      </div>

      <div className="card union-list-card">
        <div className="card-header">
          <h2 className="section-title section-title-effect">
            <BarChart3 className="title-icon" />
            Distribución por gremio
          </h2>
          <p className="card-description">Totales calculados según los filtros seleccionados</p>
        </div>
        <div className="card-content">
          {unionBreakdown.length > 0 ? (
            <div className="union-grid">
              {unionBreakdown.map((union) => (
                <div key={union.union} className="union-card">
                  <span className="union-name">{union.union}</span>
                  <span className="union-value">{formatCurrency(union.net)}</span>
                  <span className="union-detail">{union.employees} empleados</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BarChart3 className="empty-icon" />
              <h3>Sin datos para mostrar</h3>
              <p>Modifica los filtros para ver distribuciones por gremio.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card history-table-card">
        <div className="card-header">
          <h2 className="section-title section-title-effect">Historial detallado</h2>
          <p className="card-description">Consulta cada liquidación procesada según el rango seleccionado</p>
        </div>
        <div className="card-content">
          {filteredRecords.length > 0 ? (
            <div className="table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Gremio</th>
                    <th>Empleados</th>
                    <th>Total Neto</th>
                    <th>Generado</th>
                    <th>Pago programado</th>
                    <th className="actions-column">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.monthName}</td>
                      <td>
                        <span className="union-badge">{record.union}</span>
                      </td>
                      <td>{record.totalEmployees}</td>
                      <td>{formatCurrency(record.totalNet)}</td>
                      <td>{new Date(record.generatedAt).toLocaleDateString('es-ES')}</td>
                      <td>{new Date(record.paymentWindow).toLocaleDateString('es-ES')}</td>
                      <td className="actions-cell">
                        <button type="button" className="view-record-btn" onClick={() => handleOpenRecord(record)}>
                          Ver empleados
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Filter className="empty-icon" />
              <h3>No se encontraron registros</h3>
              <p>Intenta combinar los filtros de otra manera para visualizar el historial.</p>
            </div>
          )}
        </div>
      </div>

      <MonthDetailModal
        isOpen={Boolean(activeRecord)}
        record={activeRecord}
        employees={activeEmployees}
        onClose={handleCloseRecord}
        formatCurrency={formatCurrency}
      />

      <PrintReportDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        months={allMonthOptions}
        years={yearOptions.filter((option) => option.value !== 'Todos')}
        onConfirm={handleScopedPrint}
      />
    </div>
  );
}
