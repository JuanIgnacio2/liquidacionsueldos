import React from 'react';

export const Card = React.forwardRef(({className = '', ...props }, ref) => (
    <div
        ref={ref}
        className={`card ${className}`}
        {...props}
    />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef(({className = '', ...props }, ref) => (
    <div
        ref={ref}
        className={`card-header ${className}`}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef(({className = '', ...props }, ref) => (
    <h3
        ref={ref}
        className={`card-title ${className}`}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef(({className = '', ...props }, ref) => (
    <p
        ref={ref}
        className={`card-description ${className}`}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef(({ className = '', ...props }, ref) => (
  <div 
    ref={ref} 
    className={`card-content ${className}`} 
    {...props} 
  />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center card-content ${className}`}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

/**
 * StatCard - Card especializado para estadísticas
 * Muestra un icono, valor y etiqueta
 * @example
 * <StatCard 
 *   icon={Users} 
 *   value={42} 
 *   label="Empleados" 
 *   colorClass="text-green-600"
 * />
 */
export function StatCard({ icon: Icon, value, label, colorClass = '', className = '' }) {
  return (
    <Card className={`stat-card ${className}`}>
      <div className="stat-content">
        <div className="stat-info">
          <div className={`stat-value ${colorClass}`}>{value}</div>
          <p className="stat-label">{label}</p>
        </div>
        {Icon && <Icon className={`stat-icon ${colorClass}`} />}
      </div>
    </Card>
  );
}

/**
 * SummaryCard - Card especializado para resúmenes
 * Muestra un icono, etiqueta y valor grandes
 * @example
 * <SummaryCard 
 *   icon={TrendingUp} 
 *   label="Total Bonificaciones" 
 *   value="$150,000.00"
 *   theme="bonificaciones"
 * />
 */
export function SummaryCard({ icon: Icon, label, value, theme = '', className = '' }) {
  return (
    <Card className={`summary-card ${theme} ${className}`}>
      <div className="summary-icon">
        {Icon && <Icon />}
      </div>
      <div className="summary-content">
        <p className="summary-label">{label}</p>
        <p className="summary-value">{value}</p>
      </div>
    </Card>
  );
}

/**
 * StatsGrid - Contenedor para múltiples StatCard
 * @example
 * <StatsGrid stats={[
 *   { icon: Users, value: 42, label: 'Empleados', colorClass: 'text-green-600' },
 *   { icon: FileText, value: 8, label: 'Liquidaciones', colorClass: 'text-blue-600' }
 * ]} />
 */
export function StatsGrid({ stats = [], className = '' }) {
  return (
    <div className={`stats-grid ${className}`}>
      {stats.map((stat, idx) => (
        <StatCard
          key={idx}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          colorClass={stat.colorClass}
        />
      ))}
    </div>
  );
}

/**
 * SummaryGrid - Contenedor para múltiples SummaryCard
 * @example
 * <SummaryGrid summaries={[
 *   { icon: TrendingUp, label: 'Bonificaciones', value: '$150,000.00', theme: 'bonificaciones' },
 *   { icon: TrendingDown, label: 'Descuentos', value: '$50,000.00', theme: 'descuentos' }
 * ]} />
 */
export function SummaryGrid({ summaries = [], className = '' }) {
  return (
    <div className={`reportes-summary ${className}`}>
      {summaries.map((summary, idx) => (
        <SummaryCard
          key={idx}
          icon={summary.icon}
          label={summary.label}
          value={summary.value}
          theme={summary.theme}
        />
      ))}
    </div>
  );
}
