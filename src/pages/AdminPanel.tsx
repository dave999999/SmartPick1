import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AdminPanel() {
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndRedirect();
  }, []);

  const checkAdminAndRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/');
      return;
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profile?.role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}