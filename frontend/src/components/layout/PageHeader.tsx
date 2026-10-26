import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line mb-7">
      <div>
        <h1
          tabIndex={-1}
          id="page-main-heading"
          className="text-2xl sm:text-[28px] font-bold text-ink tracking-[-0.02em] focus:outline-none"
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ink-secondary mt-1.5 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
