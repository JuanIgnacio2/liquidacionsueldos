import React from 'react';
import './PayrollSummaryCards.scss';

// Helper for currency format
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(value);
};

export const PayrollSummaryCards = ({ remunerations, deductions, netAmount }) => {
    return (
        <div className="payroll-summary-cards">
            <div className="summary-card-item">
                <span className="card-label">Total Remuneraciones</span>
                <span className="card-value success">{formatCurrency(remunerations)}</span>
            </div>

            <div className="summary-card-item">
                <span className="card-label">Total Descuentos</span>
                <span className="card-value warning">{formatCurrency(deductions)}</span>
            </div>

            <div className="summary-card-item">
                <span className="card-label">NETO A COBRAR</span>
                <span className="card-value primary">{formatCurrency(netAmount)}</span>
            </div>
        </div>
    );
};
