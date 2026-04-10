"use client";

import { useEffect, useState } from "react";

interface Props {
  endedAt:  Date;
  minutes:  number; // how long chat stays open after stream ends
  onExpire: () => void;
}

export default function CountdownTimer({ endedAt, minutes, onExpire }: Props) {
  const deadline = new Date(endedAt).getTime() + minutes * 60 * 1000;

  function getRemaining() {
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  }

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (remaining === 0) { onExpire(); return; }
    const timer = setInterval(() => {
      const secs = getRemaining();
      setRemaining(secs);
      if (secs === 0) { clearInterval(timer); onExpire(); }
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (remaining === 0) {
    return <span className="text-rose-400">Chatten er nå lukket</span>;
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <span>
      Chat lukkes om{" "}
      <span className="font-semibold text-white">
        {mins}m {String(secs).padStart(2, "0")}s
      </span>
    </span>
  );
}
