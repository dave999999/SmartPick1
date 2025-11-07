import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  accent?: 'green' | 'blue' | 'orange' | 'none';
  headerContent?: ReactNode;
  className?: string;
}

const accentStyles: Record<string, string> = {
  green: 'border-2 border-[#4CC9A8]/30 bg-gradient-to-br from-white to-[#EFFFF8] shadow-xl',
  blue: 'border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl',
  orange: 'border-2 border-orange-300 bg-gradient-to-br from-white to-orange-50 shadow-xl',
  none: 'border bg-white shadow-sm'
};

export function SectionCard({ title, description, children, accent = 'none', headerContent, className = '' }: SectionCardProps) {
  return (
    <Card className={`${accentStyles[accent]} ${className}`}>
      {(title || description || headerContent) && (
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && <CardTitle className="text-lg font-bold">{title}</CardTitle>}
              {description && <CardDescription className="text-sm mt-1">{description}</CardDescription>}
            </div>
            {headerContent && <div className="self-start">{headerContent}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
