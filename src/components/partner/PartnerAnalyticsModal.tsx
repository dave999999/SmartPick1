/**
 * Partner Analytics Modal - Performance Insights Dashboard
 * 
 * Shows key metrics and trends for partners:
 * - Overview: Today's performance, week comparison
 * - Sales Trends: 7-day revenue & orders chart
 * - Popular Offers: Best performing products
 * - Customer Insights: Peak hours, avg order value
 * 
 * Design: Apple-style clean tabs with data visualization
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  TrendingDown,
  Package,
  Clock,
  Users,
  DollarSign,
  Award,
  Calendar,
  Activity
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export interface PartnerAnalytics {
  // Today's metrics
  today: {
    revenue: number;
    orders: number;
    items_sold: number;
  };
  // Yesterday for comparison
  yesterday: {
    revenue: number;
    orders: number;
  };
  // 7-day trends
  weekTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  // Top performing offers
  topOffers: Array<{
    name: string;
    orders: number;
    revenue: number;
    image_url?: string;
  }>;
  // Customer insights
  insights: {
    peak_hour: string;
    avg_order_value: number;
    repeat_customers: number;
    total_customers: number;
  };
}

interface PartnerAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analytics: PartnerAnalytics | null;
  isLoading?: boolean;
}

type TabType = 'overview' | 'trends' | 'offers' | 'customers';

export function PartnerAnalyticsModal({ 
  open, 
  onOpenChange, 
  analytics,
  isLoading = false 
}: PartnerAnalyticsModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Calculate trends
  const revenueChange = analytics 
    ? ((analytics.today.revenue - analytics.yesterday.revenue) / (analytics.yesterday.revenue || 1)) * 100
    : 0;
  const ordersChange = analytics
    ? ((analytics.today.orders - analytics.yesterday.orders) / (analytics.yesterday.orders || 1)) * 100
    : 0;

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'overview', label: t('analytics.overview'), icon: Activity },
    { id: 'trends', label: t('analytics.trends'), icon: TrendingUp },
    { id: 'offers', label: t('analytics.offers'), icon: Award },
    { id: 'customers', label: t('analytics.customers'), icon: Users },
  ];

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-2xl border-none bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <VisuallyHidden>
          <DialogTitle>პარტნიორის ანალიტიკა</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="დახურვა"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">📊 ანალიტიკა</h2>
          <p className="text-emerald-100 text-sm mt-1">თქვენი ბიზნესის მიმოხილვა</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 py-3 bg-gray-50 border-b overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewTab 
                key="overview" 
                analytics={analytics} 
                revenueChange={revenueChange}
                ordersChange={ordersChange}
              />
            )}
            {activeTab === 'trends' && (
              <TrendsTab key="trends" analytics={analytics} />
            )}
            {activeTab === 'offers' && (
              <OffersTab key="offers" analytics={analytics} />
            )}
            {activeTab === 'customers' && (
              <CustomersTab key="customers" analytics={analytics} />
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Overview Tab Component
function OverviewTab({ analytics, revenueChange, ordersChange }: { 
  analytics: PartnerAnalytics | null;
  revenueChange: number;
  ordersChange: number;
}) {
  if (!analytics) return <EmptyState />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Today's Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={DollarSign}
          label="დღევანდელი შემოსავალი"
          value={`₾${analytics.today.revenue.toFixed(2)}`}
          change={revenueChange}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <MetricCard
          icon={Package}
          label="შეკვეთები დღეს"
          value={analytics.today.orders.toString()}
          change={ordersChange}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Package}
          label="გაყიდული ერთეულები"
          value={analytics.today.items_sold.toString()}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <MetricCard
          icon={DollarSign}
          label="საშუალო შეკვეთა"
          value={`₾${analytics.insights.avg_order_value.toFixed(2)}`}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {/* Week Summary */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 mt-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          ამ კვირის შეჯამება
        </h3>
        <div className="space-y-2">
          {analytics.weekTrend.slice(-7).map((day, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{new Date(day.date).toLocaleDateString('ka-GE', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-900 font-medium">₾{day.revenue.toFixed(2)}</span>
                <span className="text-xs text-gray-500">({day.orders} შეკ.)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Trends Tab Component
function TrendsTab({ analytics }: { analytics: PartnerAnalytics | null }) {
  if (!analytics) return <EmptyState />;

  const maxRevenue = Math.max(...analytics.weekTrend.map(d => d.revenue));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <h3 className="font-semibold text-gray-900">7-დღიანი ტენდენცია</h3>
      
      {/* Simple Bar Chart */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <div className="flex items-end justify-between gap-2 h-40">
          {analytics.weekTrend.map((day, idx) => {
            const height = (day.revenue / maxRevenue) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: idx * 0.1 }}
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg"
                  />
                </div>
                <span className="text-xs text-gray-600 rotate-0">
                  {new Date(day.date).toLocaleDateString('ka-GE', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-700 mb-1">ჯამური შემოსავალი</p>
          <p className="text-xl font-bold text-emerald-900">
            ₾{analytics.weekTrend.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-blue-700 mb-1">ჯამური შეკვეთები</p>
          <p className="text-xl font-bold text-blue-900">
            {analytics.weekTrend.reduce((sum, d) => sum + d.orders, 0)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Offers Tab Component
function OffersTab({ analytics }: { analytics: PartnerAnalytics | null }) {
  if (!analytics) return <EmptyState />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <h3 className="font-semibold text-gray-900">🏆 ყველაზე პოპულარული</h3>
      
      {analytics.topOffers.length === 0 ? (
        <EmptyState message="ჯერ არ გაქვთ გაყიდული პროდუქტები" />
      ) : (
        <div className="space-y-2">
          {analytics.topOffers.map((offer, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                #{idx + 1}
              </div>
              {offer.image_url && (
                <img src={offer.image_url} alt={offer.name} className="w-12 h-12 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{offer.name}</p>
                <p className="text-xs text-gray-500">{offer.orders} შეკვეთა</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">₾{offer.revenue.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Customers Tab Component
function CustomersTab({ analytics }: { analytics: PartnerAnalytics | null }) {
  if (!analytics) return <EmptyState />;

  const repeatRate = (analytics.insights.repeat_customers / analytics.insights.total_customers) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <h3 className="font-semibold text-gray-900">მომხმარებელთა ინფორმაცია</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs text-blue-700 mb-1">სულ მომხმარებლები</p>
          <p className="text-2xl font-bold text-blue-900">{analytics.insights.total_customers}</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center mb-2">
            <Award className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs text-purple-700 mb-1">მუდმივი მომხმარებლები</p>
          <p className="text-2xl font-bold text-purple-900">{analytics.insights.repeat_customers}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-orange-700">პიკის საათი</p>
            <p className="text-xl font-bold text-orange-900">{analytics.insights.peak_hour}</p>
          </div>
        </div>
        <p className="text-xs text-orange-700">ყველაზე აქტიური დრო შეკვეთებისთვის</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm text-gray-600 mb-2">მომხმარებელთა ლოიალობა</p>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${repeatRate}%` }}
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{repeatRate.toFixed(1)}% მომხმარებლები იბრუნებიან</p>
      </div>
    </motion.div>
  );
}

// Metric Card Component
function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  iconBg, 
  iconColor 
}: { 
  icon: any;
  label: string;
  value: string;
  change?: number;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center mb-2`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}% vs გუშინ
        </div>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ message = 'მონაცემები არ არის ხელმისაწვდომი' }: { message?: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <Activity className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
