import React from 'react';

export function Btn({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`haru-btn haru-btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`haru-card ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="haru-card-title">{children}</h3>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="haru-page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function StatCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="haru-stat-card">
      <span className="haru-stat-label">{title}</span>
      <strong className="haru-stat-value">{value}</strong>
    </div>
  );
}
