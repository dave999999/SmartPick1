import { Home, ShoppingBag, Search, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: ShoppingBag, label: 'Orders', path: '/my-picks' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Bookmark, label: 'Saved', path: '/favorites' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      {/* Safe area padding for mobile devices */}
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 min-w-0 flex-1 py-1 transition-all ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {/* Icon with optional filled background circle */}
              <div
                className={`flex items-center justify-center transition-all ${
                  active
                    ? 'bg-gray-900 text-white rounded-full w-12 h-12'
                    : 'w-6 h-6'
                }`}
              >
                <Icon className={active ? 'w-6 h-6' : 'w-6 h-6'} strokeWidth={active ? 2 : 2} />
              </div>
              {/* Label text - hidden when active since icon has background */}
              {!active && (
                <span className="text-[10px] font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* iPhone home indicator */}
      <div className="h-1 bg-gray-900 rounded-full w-32 mx-auto mb-1 opacity-30" />
    </div>
  );
}
