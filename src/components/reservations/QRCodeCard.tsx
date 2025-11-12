import { useState } from "react";
import CountdownBar from "./CountdownBar";
import QRCodeModal from "./QRCodeModal";

export default function QRCodeCard({ qrCodeUrl, code, expiresAt }: { qrCodeUrl: string; code: string; expiresAt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        aria-label="Open QR code"
        className="bg-white rounded-xl p-4 sm:p-5 shadow-lg border cursor-pointer transition hover:shadow-xl w-full"
      >
        <div className="w-full aspect-square">
          <img src={qrCodeUrl} className="w-full h-full object-contain" alt="QR Code" />
        </div>
        <div className="mt-2 text-center text-xs sm:text-sm text-gray-500 font-mono tracking-wide break-all">{code}</div>
        <CountdownBar expiresAt={expiresAt} />
      </div>

      <QRCodeModal open={open} onClose={() => setOpen(false)} qrCodeUrl={qrCodeUrl} />
    </>
  );
}
