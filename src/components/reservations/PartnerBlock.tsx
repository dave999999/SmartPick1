export default function PartnerBlock({ partnerName, productImage, price, quantity }: { partnerName: string; productImage?: string; price: number; quantity: number }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md border mt-6">
      <div className="flex items-center gap-3">
        {productImage ? (
          <img className="w-16 h-16 rounded-lg object-cover" src={productImage} alt={partnerName} />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">N/A</div>
        )}
        <div>
          <div className="font-semibold text-lg truncate max-w-[180px]" title={partnerName}>{partnerName}</div>
          <div className="text-sm text-gray-500">
            {quantity} × — <span className="font-semibold text-green-600">{price} GEL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
