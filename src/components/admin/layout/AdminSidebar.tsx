/**
 * AdminSidebar Component
 * Navigation sidebar with 7 logical groups from architecture
 * 
 * Features:
 * - Collapsible groups
 * - Active route highlighting
 * - Keyboard shortcuts (shown on hover)
 * - Badge counts for pending items
 * - Mobile responsive (collapses to icon-only)
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  Shield,
  LifeBuoy,
  BarChart3,
  DollarSign,
  Bell,
  MessageSquare,
  Activity,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  shortcut?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['dashboard', 'business']);

  // Navigation structure from architecture document
  const navGroups: NavGroup[] = [
    {
      label: 'Dashboard',
      items: [
        { 
          label: 'Overview', 
          href: '/admin', 
          icon: <LayoutDashboard className="h-4 w-4" />,
          shortcut: '1'
        },
      ],
    },
    {
      label: 'Business',
      items: [
        { 
          label: 'Users', 
          href: '/admin/users', 
          icon: <Users className="h-4 w-4" />,
          shortcut: '2'
        },
        { 
          label: 'Partners', 
          href: '/admin/partners', 
          icon: <Store className="h-4 w-4" />,
          badge: 5, // Example: 5 pending approvals
          shortcut: '3'
        },
        { 
          label: 'Offers', 
          href: '/admin/offers', 
          icon: <Package className="h-4 w-4" />,
          shortcut: '4'
        },
        { 
          label: 'Reservations', 
          href: '/admin/reservations', 
          icon: <ShoppingCart className="h-4 w-4" />,
          badge: 12, // Example: 12 expiring soon
          shortcut: '5'
        },
      ],
    },
    {
      label: 'Safety & Support',
      items: [
        { 
          label: 'Support Tickets', 
          href: '/admin/support', 
          icon: <LifeBuoy className="h-4 w-4" />,
          badge: 3, // Example: 3 unassigned
          shortcut: '6'
        },
        { 
          label: 'Fraud Prevention', 
          href: '/admin/fraud', 
          icon: <Shield className="h-4 w-4" />,
          shortcut: '7'
        },
        { 
          label: 'Moderation', 
          href: '/admin/moderation', 
          icon: <AlertTriangle className="h-4 w-4" />
        },
      ],
    },
    {
      label: 'Finance',
      items: [
        { 
          label: 'Analytics', 
          href: '/admin/analytics', 
          icon: <BarChart3 className="h-4 w-4" />,
          shortcut: '8'
        },
        { 
          label: 'Revenue', 
          href: '/admin/revenue', 
          icon: <DollarSign className="h-4 w-4" />
        },
      ],
    },
    {
      label: 'Communication',
      items: [
        { 
          label: 'Notifications', 
          href: '/admin/notifications', 
          icon: <Bell className="h-4 w-4" />
        },
        { 
          label: 'Messages', 
          href: '/admin/messages', 
          icon: <MessageSquare className="h-4 w-4" />
        },
      ],
    },
    {
      label: 'Monitoring',
      items: [
        { 
          label: 'Live Activity', 
          href: '/admin/live', 
          icon: <Activity className="h-4 w-4" />,
          shortcut: '9'
        },
        { 
          label: 'System Health', 
          href: '/admin/health', 
          icon: <Activity className="h-4 w-4" />
        },
      ],
    },
    {
      label: 'System',
      items: [
        { 
          label: 'Settings', 
          href: '/admin/settings', 
          icon: <Settings className="h-4 w-4" />
        },
        { 
          label: 'Audit Log', 
          href: '/admin/audit', 
          icon: <Shield className="h-4 w-4" />
        },
      ],
    },
  ];

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo & Toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SP</span>
              </div>
              <div>
                <div className="font-semibold text-sm">SmartPick</div>
                <div className="text-xs text-gray-500">Admin</div>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Global Search */}
        {!collapsed && (
          <div className="p-4 border-b border-gray-200">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => {
                // TODO: Open global search modal (Cmd+K)
                console.log('Open global search');
              }}
            >
              <Search className="h-4 w-4" />
              <span>Search...</span>
              <kbd className="ml-auto text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Groups */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-6">
            {navGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.label.toLowerCase().replace(' & ', '-'));

              return (
                <div key={group.label}>
                  {/* Group Header */}
                  {!collapsed && (
                    <button
                      onClick={() => toggleGroup(group.label.toLowerCase().replace(' & ', '-'))}
                      className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    >
                      <span>{group.label}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  )}

                  {/* Group Items */}
                  {(isExpanded || collapsed) && (
                    <div className={cn('space-y-1', !collapsed && 'mt-2')}>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                            isActive(item.href)
                              ? 'bg-teal-50 text-teal-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          {item.icon}
                          {!collapsed && (
                            <>
                              <span className="flex-1">{item.label}</span>
                              
                              {/* Badge for counts */}
                              {item.badge && item.badge > 0 && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-red-100 text-red-700 hover:bg-red-100">
                                  {item.badge}
                                </Badge>
                              )}

                              {/* Keyboard shortcut */}
                              {item.shortcut && (
                                <kbd className="text-xs text-gray-400">
                                  {item.shortcut}
                                </kbd>
                              )}
                            </>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {!collapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="text-xs text-gray-500 text-center">
              Version 1.0.0
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
