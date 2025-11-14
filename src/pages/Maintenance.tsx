import { ShieldAlert } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">We’ll be right back</h1>
        <p className="text-gray-600 mb-6">
          SmartPick is down for maintenance while we roll out improvements.
          Thanks for your patience.
        </p>
        <p className="text-sm text-gray-500">If you need help, contact support at
          <a className="text-blue-600 hover:underline ml-1" href="mailto:support@smartpick.ge">support@smartpick.ge</a>.
        </p>
      </div>
    </div>
  );
}
