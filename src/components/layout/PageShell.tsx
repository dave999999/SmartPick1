import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  padded?: boolean;
  maxWidth?: string;
}

// Provides unified gradient background and vertical spacing similar to UserProfile page
export function PageShell({ children, padded = true, maxWidth = 'max-w-7xl' }: PageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#EFFFF8] to-[#C9F9E9]">
      <div className={`w-full mx-auto ${maxWidth} ${padded ? 'px-4 sm:px-6 lg:px-8 py-8' : ''}`}>{children}</div>
    </div>
  );
}

