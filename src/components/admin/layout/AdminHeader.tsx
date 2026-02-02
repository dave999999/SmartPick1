/**
 * AdminHeader Component
 * Top header with profile menu, notifications, and quick actions
 * 
 * Features:
 * - Admin profile dropdown
 * - Notification bell with count
 * - Quick actions menu
 * - System status indicator
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  LogOut,
  Settings,
  Shield,
  Moon,
  Sun,
  ChevronDown,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
interface AdminHeaderProps {
  className?: string;
}

export function AdminHeader({ className }: AdminHeaderProps) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notificationCount] = useState(3); // TODO: Get from real-time subscription

  // TODO: Get from actual auth context when integrated
  const adminUser = {
    name: 'Admin User',
    email: 'admin@smartpick.ge',
    role: 'Super Admin',
    avatar: undefined,
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 ${className}`}>
      {/* Left: Page Title (can be dynamic based on route) */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, {adminUser.name.split(' ')[0]}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* System Status */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
          <span>All Systems Operational</span>
        </div>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {/* TODO: Real notification items */}
              <div className="p-3 hover:bg-gray-50 cursor-pointer border-b">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New partner application</p>
                    <p className="text-xs text-gray-500">Bakery "Fresh Bread" requested approval</p>
                    <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 hover:bg-gray-50 cursor-pointer border-b">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Urgent support ticket</p>
                    <p className="text-xs text-gray-500">User reported payment issue (SLA: 28 min)</p>
                    <p className="text-xs text-gray-400 mt-1">15 minutes ago</p>
                  </div>
                </div>
              </div>

              <div className="p-3 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Daily report ready</p>
                    <p className="text-xs text-gray-500">Yesterday's analytics summary generated</p>
                    <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              className="w-full justify-center text-sm"
              onClick={() => navigate('/admin/notifications')}
            >
              View all notifications
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Admin Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={adminUser.avatar} />
                <AvatarFallback className="bg-teal-500 text-white text-xs">
                  {getInitials(adminUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">{adminUser.name}</div>
                <div className="text-xs text-gray-500">{adminUser.role}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <div className="font-medium">{adminUser.name}</div>
                <div className="text-xs text-gray-500 font-normal">{adminUser.email}</div>
                <Badge variant="secondary" className="mt-2 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {adminUser.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
              <User className="h-4 w-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
