import { Offer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Pause, Play, RefreshCw, Eye, Copy } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { resolveOfferImageUrl } from '@/lib/api';

interface EnhancedOffersTableProps {
  offers: Offer[];
  onEdit: (offer: Offer) => void;
  onDelete: (offerId: string) => void;
  onTogglePause: (offerId: string, currentStatus: string) => void;
  onRepost: (offer: Offer) => void;
  onDuplicate?: (offer: Offer) => void;
  processingIds: Set<string>;
  getOfferDisplayStatus: (offer: Offer) => string;
}

export default function EnhancedOffersTable({
  offers,
  onEdit,
  onDelete,
  onTogglePause,
  onRepost,
  onDuplicate,
  processingIds,
  getOfferDisplayStatus,
}: EnhancedOffersTableProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      case 'SOLD_OUT':
        return 'bg-red-100 text-red-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Mobile View: Cards
  if (isMobile) {
    return (
      <div className="space-y-3 pb-20">
        {offers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No offers yet. Create your first offer to get started!
            </CardContent>
          </Card>
        ) : (
          offers.map((offer) => {
            const status = getOfferDisplayStatus(offer);
            const isProcessing = processingIds.has(offer.id);
            const imageUrl = offer.images && offer.images.length > 0
              ? resolveOfferImageUrl(offer.images[0])
              : null;

            return (
              <Card key={offer.id} className="overflow-hidden">
                <div className="flex gap-3 p-3">
                  {/* Offer Image */}
                  {imageUrl && (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={offer.title + ' offer image'}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Offer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{offer.title}</h3>
                      <Badge className={`${getStatusColor(status)} text-xs px-2 py-0.5`}>
                        {status}
                      </Badge>
                    </div>

                    {/* Price & Quantity */}
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                      <div>
                        <span className="line-through">{offer.original_price} ₾</span>
                        <span className="ml-1 font-bold text-green-600">{offer.smart_price} ₾</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{offer.quantity_available || 0}</span>
                        <span>/</span>
                        <span className="text-gray-400">{offer.quantity_total}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(offer)}
                        className="h-8 px-2 text-xs"
                        disabled={isProcessing}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>

                      {status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onTogglePause(offer.id, status)}
                          className="h-8 px-2 text-xs"
                          disabled={isProcessing}
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      )}

                      {status === 'PAUSED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onTogglePause(offer.id, status)}
                          className="h-8 px-2 text-xs"
                          disabled={isProcessing}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      )}

                      {(status === 'EXPIRED' || status === 'SOLD_OUT') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRepost(offer)}
                          className="h-8 px-2 text-xs"
                          disabled={isProcessing}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Repost
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(offer.id)}
                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50"
                        disabled={isProcessing}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  // Desktop View: Table
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                No offers yet. Create your first offer to get started!
              </TableCell>
            </TableRow>
          ) : (
            offers.map((offer) => {
              const status = getOfferDisplayStatus(offer);
              const isProcessing = processingIds.has(offer.id);
              const imageUrl = offer.images && offer.images.length > 0
                ? resolveOfferImageUrl(offer.images[0])
                : null;

              return (
                <TableRow key={offer.id}>
                  <TableCell>
                    {imageUrl ? (
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                        <img
                          src={imageUrl}
                          alt={offer.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{offer.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {offer.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="line-through text-xs text-gray-400">
                        {offer.original_price} ₾
                      </span>
                      <span className="font-bold text-green-600">{offer.smart_price} ₾</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{offer.quantity_available || 0}</span>
                    <span className="text-gray-400"> / {offer.quantity_total}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(status)}>{status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(offer)}
                        disabled={isProcessing}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTogglePause(offer.id, status)}
                          disabled={isProcessing}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}

                      {status === 'PAUSED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTogglePause(offer.id, status)}
                          disabled={isProcessing}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}

                      {(status === 'EXPIRED' || status === 'SOLD_OUT') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRepost(offer)}
                          disabled={isProcessing}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(offer.id)}
                        className="text-red-600 hover:bg-red-50"
                        disabled={isProcessing}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
