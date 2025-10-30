import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog';
import { Button } from './Button';
import { Input } from './Input';
import { useRedeemReservationMutation } from '../helpers/useFoodWasteQueries';
import { schema as redeemSchema } from '../endpoints/reservations/redeem_POST.schema';
import { type PartnerReservation } from '../endpoints/reservations/partner_GET.schema';
import styles from './RedeemReservationDialog.module.css';

type RedeemReservationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: PartnerReservation;
};

type FormData = z.infer<typeof redeemSchema>;

export const RedeemReservationDialog = ({
  open,
  onOpenChange,
  reservation,
}: RedeemReservationDialogProps) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const redeemMutation = useRedeemReservationMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(redeemSchema),
    defaultValues: {
      reservationId: reservation.reservationId,
      verificationCode: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        reservationId: reservation.reservationId,
        verificationCode: '',
      });
      setApiError(null);
    }
  }, [open, reservation, reset]);

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await redeemMutation.mutateAsync(data);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
      console.error('Redemption failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle>Redeem Reservation</DialogTitle>
          <DialogDescription>
            Enter the 6-digit verification code from the customer to complete the redemption.
          </DialogDescription>
        </DialogHeader>

        <div className={styles.reservationDetails}>
          <p><strong>Product:</strong> {reservation.productTitle}</p>
          <p><strong>Customer:</strong> {reservation.userDisplayName}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="verificationCode" className={styles.label}>
              Verification Code
            </label>
            <Input
              id="verificationCode"
              type="text"
              maxLength={6}
              placeholder="123456"
              {...register('verificationCode')}
              className={errors.verificationCode ? styles.inputError : ''}
              autoComplete="one-time-code"
              inputMode="numeric"
            />
            {errors.verificationCode && (
              <p className={styles.errorMessage}>{errors.verificationCode.message}</p>
            )}
          </div>

          {apiError && (
            <p className={`${styles.errorMessage} ${styles.apiError}`}>
              {apiError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className={styles.spinner} size={16} />
                  Redeeming...
                </>
              ) : (
                'Redeem'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};