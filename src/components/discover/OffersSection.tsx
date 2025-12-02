/**
 * OffersSection - Generic section wrapper with title
 */

import React, { ReactNode } from 'react';

interface OffersSectionProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function OffersSection({ title, icon, action, children }: OffersSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
