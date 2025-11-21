import { X } from "lucide-react";

export default function QRCodeModal({ open, onClose, qrCodeUrl }: { open: boolean; onClose: () => void; qrCodeUrl: string }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-xl p-3 sm:p-4 max-w-xs sm:max-w-sm w-full shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <img src={qrCodeUrl} className="w-full h-full object-contain rounded" alt="QR Code" />
      </div>
    </div>
  );
}
