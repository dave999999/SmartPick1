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
    <div className="fixed bottom-0 left-0 right-0 bg-white z-[70]">
      {/* Navigation Icons */}
      <div className="flex items-center justify-around px-4 pt-2 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center justify-center flex-1 py-2.5 transition-colors ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {/* Icon with filled circle background when active */}
              <div
                className={`flex items-center justify-center transition-all ${
                  active
                    ? 'bg-gray-900 text-white rounded-full w-14 h-11 shadow-sm'
                    : 'w-6 h-6'
                }`}
              >
                <Icon 
                  className={active ? 'w-5 h-5' : 'w-6 h-6'} 
                  strokeWidth={2} 
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* iPhone home indicator bar */}
      <div className="h-1 bg-gray-900 rounded-full w-32 mx-auto mb-1.5 opacity-40" />
    </div>
  );
}
