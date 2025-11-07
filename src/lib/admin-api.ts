import { supabase, isDemoMode } from './supabase';
import type { User, Partner, Offer } from './types';

// Test connection function
export const testAdminConnection = async () => {
  console.log('Admin API: Testing connection...');
  
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('partners')
      .select('count', { count: 'exact', head: true });
    
    console.log('Admin API: Connection test result:', { testData, testError });
    
    // Test current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Admin API: Current user:', { user: user?.email, userError });
    
    return {
      connected: !testError,
      user: user?.email || null,
      error: testError?.message || userError?.message || null
    };
  } catch (error) {
    console.error('Admin API: Connection test failed:', error);
    return {
      connected: false,
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Strict admin authentication check
export const checkAdminAccess = async () => {
  if (isDemoMode) {
    console.log('Admin API: Demo mode - skipping strict admin check');
    return null;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Auth error: ${authError.message}`);
  if (!user) throw new Error('Not authenticated');

  console.log('Admin API: Verifying admin role for user:', user.email);

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Admin API: Failed to fetch user profile for admin check', profileError);
    throw new Error('Admin profile verification failed');
  }

  const userRole = profile?.role?.toUpperCase();
  if (userRole !== 'ADMIN') {
    console.warn('Admin API: Access denied - user is not ADMIN');
    throw new Error('Admin access required');
  }

  return user;
};

// Partners Management
export const getAllPartners = async () => {
  if (isDemoMode) {
    console.log('Admin API: Demo mode - returning empty array');
    return [];
  }
  
  try {
    console.log('Admin API: Fetching all partners...');
    await checkAdminAccess();
    
    const { data, error, count } = await supabase
      .from('partners')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    console.log('Admin API: Partners query result:', { data, error, count });

    if (error) {
      console.error('Admin API: Error fetching partners:', error);
      throw error;
    }

    console.log('Admin API: Successfully fetched partners:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Admin API: Exception in getAllPartners:', error);
    return [];
  }
};

export const getPendingPartners = async () => {
  if (isDemoMode) {
    return [];
  }
  
  try {
    console.log('Admin API: Fetching pending partners...');
    await checkAdminAccess();
    
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
      
    console.log('Admin API: Pending partners result:', { data, error });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Admin API: Error fetching pending partners:', error);
    return [];
  }
};

export const updatePartner = async (partnerId: string, updates: Partial<Partner>) => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  try {
    console.log('Admin API: Updating partner:', partnerId, updates);
    await checkAdminAccess();
    
    const { data, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', partnerId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Admin API: Error updating partner:', error);
    throw error;
  }
};

export const deletePartner = async (partnerId: string) => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  await checkAdminAccess();
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', partnerId);
    
  if (error) throw error;
};

export const approvePartner = async (partnerId: string) => {
  await checkAdminAccess();
  return updatePartner(partnerId, { status: 'APPROVED' });
};

export const pausePartner = async (partnerId: string) => {
  await checkAdminAccess();
  return updatePartner(partnerId, { status: 'PAUSED' });
};

export const unpausePartner = async (partnerId: string) => {
  await checkAdminAccess();
  return updatePartner(partnerId, { status: 'APPROVED' });
};

export const disablePartner = async (partnerId: string) => {
  await checkAdminAccess();
  return updatePartner(partnerId, { status: 'BLOCKED' });
};

// Users Management
export const getAllUsers = async () => {
  if (isDemoMode) {
    console.log('Admin API: Demo mode - returning empty array');
    return [];
  }
  
  try {
    console.log('Admin API: Fetching all users...');
    await checkAdminAccess();
    
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    console.log('Admin API: Users query result:', { data, error, count });

    if (error) {
      console.error('Admin API: Error fetching users:', error);
      throw error;
    }

    console.log('Admin API: Successfully fetched users:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Admin API: Exception in getAllUsers:', error);
    return [];
  }
};

export const getNewUsers = async () => {
  if (isDemoMode) {
    return [];
  }
  
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  
  await checkAdminAccess();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .gte('created_at', fourDaysAgo.toISOString())
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  await checkAdminAccess();
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteUser = async (userId: string) => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  await checkAdminAccess();
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
    
  if (error) throw error;
};

export const disableUser = async (userId: string) => {
  await checkAdminAccess();
  return updateUser(userId, { status: 'DISABLED' });
};

export const enableUser = async (userId: string) => {
  await checkAdminAccess();
  return updateUser(userId, { status: 'ACTIVE' });
};

// Banned Users Management
export const getBannedUsers = async () => {
  if (isDemoMode) {
    return [];
  }

  try {
    await checkAdminAccess();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'BANNED')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Admin API: Error fetching banned users:', error);
    return [];
  }
};

export const unbanUser = async (userId: string) => {
  if (isDemoMode) {
    return;
  }

  try {
    await checkAdminAccess();
    const { error } = await supabase
      .from('users')
      .update({
        status: 'ACTIVE',
        penalty_count: 0,
        penalty_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Admin API: Error unbanning user:', error);
    throw error;
  }
};

// Offers Management
export const getAllOffers = async () => {
  if (isDemoMode) {
    return [];
  }
  
  try {
    await checkAdminAccess();
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        partner:partners(business_name, business_type)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Admin API: Error fetching offers:', error);
    return [];
  }
};

export const getPartnerOffers = async (partnerId: string) => {
  if (isDemoMode) {
    return [];
  }
  
  await checkAdminAccess();
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const updateOffer = async (offerId: string, updates: Partial<Offer>) => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  await checkAdminAccess();
  const { data, error } = await supabase
    .from('offers')
    .update(updates)
    .eq('id', offerId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteOffer = async (offerId: string) => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  await checkAdminAccess();
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', offerId);
    
  if (error) throw error;
};

export const pauseOffer = async (offerId: string) => {
  await checkAdminAccess();
  return updateOffer(offerId, { status: 'PAUSED' });
};

export const resumeOffer = async (offerId: string) => {
  await checkAdminAccess();
  return updateOffer(offerId, { status: 'ACTIVE' });
};

export const disableOffer = async (offerId: string) => {
  await checkAdminAccess();
  return updateOffer(offerId, { status: 'EXPIRED' });
};

export const enableOffer = async (offerId: string) => {
  await checkAdminAccess();
  return updateOffer(offerId, { status: 'ACTIVE' });
};

// Dashboard Stats
export const getDashboardStats = async () => {
  if (isDemoMode) {
    console.log('Admin API: Demo mode - returning mock stats');
    return {
      totalPartners: 0,
      totalUsers: 0,
      totalOffers: 0,
      pendingPartners: 0
    };
  }

  try {
    console.log('Admin API: Fetching dashboard stats...');
    await checkAdminAccess();

    // Get all counts in parallel
    const [partnersResult, usersResult, offersResult, pendingPartnersResult] = await Promise.all([
      supabase.from('partners').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('offers').select('id', { count: 'exact', head: true }),
      supabase.from('partners').select('id', { count: 'exact', head: true }).eq('status', 'PENDING')
    ]);

    console.log('Admin API: Stats query results:', {
      partners: partnersResult,
      users: usersResult,
      offers: offersResult,
      pendingPartners: pendingPartnersResult
    });

    const stats = {
      totalPartners: partnersResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalOffers: offersResult.count || 0,
      pendingPartners: pendingPartnersResult.count || 0
    };

    console.log('Admin API: Final stats:', stats);
    return stats;
  } catch (error) {
    console.error('Admin API: Error fetching dashboard stats:', error);
    return {
      totalPartners: 0,
      totalUsers: 0,
      totalOffers: 0,
      pendingPartners: 0
    };
  }
};