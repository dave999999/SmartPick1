import { Home, ShoppingBag, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser, getPartnerByUserId } from '@/lib/api';

export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPartner, setIsPartner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserType();
  }, []);

  const checkUserType = async () => {
    const { user } = await getCurrentUser();
    if (user) {
      const partner = await getPartnerByUserId(user.id);
      setIsPartner(partner !== null && partner.status === 'APPROVED');
    }
    setIsLoading(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const handleProfileClick = () => {
    if (isPartner) {
      navigate('/partner');
    } else {
      navigate('/profile');
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/', onClick: () => navigate('/') },
    { icon: ShoppingBag, label: 'Orders', path: '/my-picks', onClick: () => navigate('/my-picks') },
    { icon: Bookmark, label: 'Saved', path: '/favorites', onClick: () => navigate('/favorites') },
    { icon: User, label: 'Profile', path: isPartner ? '/partner' : '/profile', onClick: handleProfileClick },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white z-[70]">
      {/* Navigation Icons */}
      <div className="flex items-center justify-around px-4 pt-2 pb-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={index}
              onClick={item.onClick}
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
