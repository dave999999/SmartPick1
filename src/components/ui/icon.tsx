/**
 * Icon Accessibility Wrapper
 * 
 * Ensures Lucide React icons follow accessibility best practices:
 * - Decorative icons (with adjacent text) are hidden from screen readers
 * - Standalone icons have proper aria-labels
 * 
 * Usage:
 * ```tsx
 * // Decorative (next to text)
 * <Icon icon={Heart} decorative />
 * 
 * // Standalone (needs label)
 * <Icon icon={Search} label="Search offers" />
 * ```
 */

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: LucideIcon;
  /** If true, hides icon from screen readers (use when icon is decorative/next to text) */
  decorative?: boolean;
  /** Accessible label for standalone icons (required if not decorative) */
  label?: string;
  /** Additional className */
  className?: string;
  /** Icon size */
  size?: number;
}

export function Icon({ 
  icon: IconComponent, 
  decorative = false, 
  label, 
  className, 
  size,
  ...props 
}: IconProps) {
  // Validate: standalone icons must have labels
  if (!decorative && !label && process.env.NODE_ENV === 'development') {
    console.warn(
      `Icon: Non-decorative icon missing aria-label. ` +
      `Either add label prop or set decorative={true} if icon is next to text.`
    );
  }

  return (
    <IconComponent
      className={cn(className)}
      size={size}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={!decorative && label ? label : undefined}
      role={!decorative && label ? 'img' : undefined}
      {...props}
    />
  );
}

/**
 * Quick helper for decorative icons (most common case)
 * Use when icon appears next to text that conveys the same meaning
 */
export function DecorativeIcon({ icon, className, size, ...props }: Omit<IconProps, 'decorative' | 'label'>) {
  return <Icon icon={icon} decorative className={className} size={size} {...props} />;
}

/**
 * Quick helper for standalone icons
 * Use for icon-only buttons or informational icons
 */
export function StandaloneIcon({ icon, label, className, size, ...props }: Required<Pick<IconProps, 'icon' | 'label'>> & Omit<IconProps, 'decorative'>) {
  return <Icon icon={icon} label={label} className={className} size={size} {...props} />;
}
