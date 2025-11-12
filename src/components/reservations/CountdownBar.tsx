import { useEffect, useState } from "react";

export default function CountdownBar({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Assume 30 minutes window by default unless backend provides total
  const total = 30 * 60 * 1000;
  const percent = Math.max(0, (timeLeft / total) * 100);

  const format = (ms: number) => {
    const m = Math.floor(ms / 1000 / 60);
    const s = Math.floor((ms / 1000) % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const barColor =
    percent > 60 ? "bg-green-500" : percent > 20 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="w-full mt-3">
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-gray-700">
        <span>Time left</span>
        <span className="tabular-nums font-semibold">{format(timeLeft)}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-2 transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
