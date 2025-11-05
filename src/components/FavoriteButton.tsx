import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  id: string;
  type?: 'offer' | 'partner';
  variant?: 'default' | 'icon';
  className?: string;
}

export default function FavoriteButton({
  id,
  type = 'offer',
  variant = 'icon',
  className
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t } = useI18n();
  const favorite = isFavorite(id, type);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    const nowFavorite = toggleFavorite(id, type);
    toast.success(nowFavorite ? t('favorites.added') : t('favorites.removed'));
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn(
          "h-8 w-8 rounded-full hover:bg-white/80 transition-all",
          className
        )}
        title={favorite ? t('favorites.remove') : t('favorites.add')}
      >
        <Heart
          className={cn(
            "w-5 h-5 transition-all",
            favorite
              ? "fill-red-500 text-red-500"
              : "text-gray-600 hover:text-red-500"
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={favorite ? 'default' : 'outline'}
      onClick={handleClick}
      className={cn(
        favorite && "bg-red-500 hover:bg-red-600",
        className
      )}
    >
      <Heart
        className={cn(
          "w-4 h-4 mr-2",
          favorite ? "fill-white" : ""
        )}
      />
      {favorite ? t('favorites.remove') : t('favorites.add')}
    </Button>
  );
}
