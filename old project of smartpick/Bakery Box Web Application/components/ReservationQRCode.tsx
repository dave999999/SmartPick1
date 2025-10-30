import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Skeleton } from './Skeleton';
import styles from './ReservationQRCode.module.css';

interface ReservationQRCodeProps {
  reservationId: number;
  verificationCode: string;
  size?: number;
  className?: string;
}

export const ReservationQRCode = ({
  reservationId,
  verificationCode,
  size = 200,
  className,
}: ReservationQRCodeProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = JSON.stringify({ reservationId, verificationCode });
        const url = await QRCode.toDataURL(data, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: size,
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code', err);
        setError('Could not generate QR code.');
        if (err instanceof Error) {
            setError(`Could not generate QR code: ${err.message}`);
        } else {
            setError('An unknown error occurred while generating the QR code.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    generateQRCode();
  }, [reservationId, verificationCode, size]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <p className={styles.instruction}>Show this QR code to the store</p>
      <div className={styles.qrWrapper} style={{ width: size, height: size }}>
        {isLoading && <Skeleton className={styles.skeleton} />}
        {error && <div className={styles.error}>{error}</div>}
        {qrCodeUrl && !isLoading && (
          <img src={qrCodeUrl} alt="Reservation QR Code" width={size} height={size} />
        )}
      </div>
      <div className={styles.codeContainer}>
        <p className={styles.codeLabel}>Verification Code</p>
        <p className={styles.verificationCode}>{verificationCode}</p>
      </div>
    </div>
  );
};