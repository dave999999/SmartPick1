import { QR_CODE_SIZE, QR_CODE_MARGIN } from '../constants';

/**
 * QR Code Generation Module
 * Handles QR code generation for reservations and other purposes
 */

export const generateQRCodeDataURL = async (text: string): Promise<string> => {
  try {
    // Dynamically import qrcode to avoid pulling it into the main bundle
    const { default: QRCode } = await import('qrcode');
    return await QRCode.toDataURL(text, {
      width: QR_CODE_SIZE,
      margin: QR_CODE_MARGIN,
      color: {
        dark: '#333333',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('QR Code generation error:', err);
    return '';
  }
};
