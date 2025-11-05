import { useI18n } from '@/lib/i18n';
import { Construction } from 'lucide-react';

export default function MaintenanceMode() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex justify-center">
          <Construction className="w-24 h-24 text-orange-500 animate-pulse" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-orange-600">
            {t('maintenance.title')}
          </h1>
          <h2 className="text-xl font-semibold text-gray-800">
            {t('maintenance.subtitle')}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('maintenance.message')}
          </p>
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
