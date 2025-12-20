/**
 * ReservationHistory.tsx
 * Professional timeline-based reservation history page
 * Features: Status filtering, search, grouped by date, active reservations highlighted
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  MapPin,
  Star,
  Package
} from 'lucide-react';
import { getCurrentUser } from '@/lib/api/auth';
import { getCustomerReservations } from '@/lib/api/reservations';
import { Reservation } from '@/lib/types';
import { subscribeToReservations } from '@/lib/api/realtime';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';

type StatusFilter = 'all' | 'ACTIVE' | 'PICKED_UP' | 'CANCELLED' | 'EXPIRED' | 'FAILED_PICKUP';

interface GroupedReservations {
  today: Reservation[];
  yesterday: Reservation[];
  thisWeek: Reservation[];
  earlier: Reservation[];
}

export default function ReservationHistory() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    loadUserAndReservations();
  }, []);

  useEffect(() => {
    if (user) {
      const subscription = subscribeToReservations(user.id, () => {
        loadReservations();
      });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [user]);

  // Filter reservations when search or status filter changes
  useEffect(() => {
    let filtered = reservations;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.offer?.title.toLowerCase().includes(query) ||
        r.offer?.partner?.business_name.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query)
      );
    }

    setFilteredReservations(filtered);
  }, [reservations, statusFilter, searchQuery]);

  const loadUserAndReservations = async () => {
    try {
      setLoading(true);
      const { user: currentUser } = await getCurrentUser();
      
      if (!currentUser) {
        toast.error(t('toast.signInToViewPicks'));
        navigate('/');
        return;
      }

      setUser(currentUser);
      await loadReservations(currentUser.id);
    } catch (error) {
      logger.error('Error loading user and reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async (userId?: string) => {
    try {
      const userIdToUse = userId || user?.id;
      if (!userIdToUse) return;

      const reservationsData = await getCustomerReservations(userIdToUse);
      setReservations(reservationsData || []);
    } catch (error) {
      logger.error('Error loading reservations:', error);
      toast.error('Failed to load reservations');
    }
  };

  // Group reservations by date
  const groupReservationsByDate = (reservations: Reservation[]): GroupedReservations => {
    const grouped: GroupedReservations = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: []
    };

    reservations.forEach(reservation => {
      const date = parseISO(reservation.created_at);
      
      if (isToday(date)) {
        grouped.today.push(reservation);
      } else if (isYesterday(date)) {
        grouped.yesterday.push(reservation);
      } else if (isThisWeek(date)) {
        grouped.thisWeek.push(reservation);
      } else {
        grouped.earlier.push(reservation);
      }
    });

    return grouped;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { 
          icon: Clock, 
          color: 'text-orange-600', 
          bg: 'bg-orange-50', 
          border: 'border-orange-200',
          label: t('history.active') 
        };
      case 'PICKED_UP':
        return { 
          icon: CheckCircle, 
          color: 'text-green-600', 
          bg: 'bg-green-50', 
          border: 'border-green-200',
          label: t('history.pickedUp') 
        };
      case 'CANCELLED':
        return { 
          icon: XCircle, 
          color: 'text-gray-600', 
          bg: 'bg-gray-50', 
          border: 'border-gray-200',
          label: t('history.cancelled') 
        };
      case 'EXPIRED':
        return { 
          icon: AlertCircle, 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          border: 'border-red-200',
          label: t('history.expired') 
        };
      case 'FAILED_PICKUP':
        return { 
          icon: AlertCircle, 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          border: 'border-red-200',
          label: t('history.failed') 
        };
      default:
        return { 
          icon: Package, 
          color: 'text-gray-600', 
          bg: 'bg-gray-50', 
          border: 'border-gray-200',
          label: status 
        };
    }
  };

  const renderReservationCard = (reservation: Reservation) => {
    const statusConfig = getStatusConfig(reservation.status);
    const StatusIcon = statusConfig.icon;
    const offer = reservation.offer;

    return (
      <motion.div
        key={reservation.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-2xl overflow-hidden ${statusConfig.bg} ${statusConfig.border} border-2 mb-3`}
      >
        <div className="flex gap-3 p-3">
          {/* Offer Image */}
          <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
            <img 
              src={offer?.images?.[0] || '/images/Map.jpg'} 
              alt={offer?.title || 'Offer'}
              className="w-full h-full object-cover"
            />
            {reservation.status === 'ACTIVE' && (
              <div className="absolute inset-0 bg-orange-500/20 backdrop-blur-[1px] flex items-center justify-center">
                <Clock className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.border} border mb-1.5`}>
              <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
              <span className={`text-[10px] font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-bold text-[15px] text-gray-900 line-clamp-1 mb-0.5">
              {offer?.title || 'Offer'}
            </h3>

            {/* Partner */}
            <div className="flex items-center gap-1 text-gray-600 mb-1.5">
              <MapPin className="w-3 h-3" />
              <span className="text-[11px] line-clamp-1">
                {offer?.partner?.business_name || 'Partner'}
              </span>
            </div>

            {/* Price & Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-black text-gray-900">
                  ₾{Math.round(offer?.smart_price || 0)}
                </span>
                {offer?.original_price && (
                  <span className="text-[12px] line-through text-gray-400">
                    ₾{Math.round(offer.original_price)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px]">
                  {format(parseISO(reservation.created_at), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {reservation.status === 'PICKED_UP' && (
              <button 
                className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 bg-white rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Star className="w-3 h-3" />
                {t('history.rateExperience')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderGroup = (title: string, reservations: Reservation[]) => {
    if (reservations.length === 0) return null;

    return (
      <div className="mb-6">
        <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-3 px-4">
          {title}
        </h2>
        <div className="px-4">
          {reservations.map(reservation => renderReservationCard(reservation))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const groupedReservations = groupReservationsByDate(filteredReservations);
  const totalReservations = reservations.length;
  const activeCount = reservations.filter(r => r.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-[20px] font-black text-gray-900">
                {t('history.title')}
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {totalReservations} {t('history.totalReservations').toLowerCase()}
                {activeCount > 0 && ` • ${activeCount} ${t('history.active').toLowerCase()}`}
              </p>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Filter className={`w-5 h-5 ${showFilters ? 'text-orange-600' : 'text-gray-900'}`} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('history.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>

          {/* Status Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
                  {(['all', 'ACTIVE', 'PICKED_UP', 'CANCELLED', 'EXPIRED'] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                        statusFilter === status
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? t('history.all') : getStatusConfig(status).label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto pt-6">
        {filteredReservations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-gray-900 mb-2">
              {t('history.noReservations')}
            </h3>
            <p className="text-[13px] text-gray-500">
              {searchQuery ? 'Try a different search' : 'Start exploring offers to make your first reservation'}
            </p>
          </div>
        ) : (
          <>
            {renderGroup(t('history.today'), groupedReservations.today)}
            {renderGroup(t('history.yesterday'), groupedReservations.yesterday)}
            {renderGroup(t('history.thisWeek'), groupedReservations.thisWeek)}
            {renderGroup(t('history.earlier'), groupedReservations.earlier)}
          </>
        )}
      </div>
    </div>
  );
}
