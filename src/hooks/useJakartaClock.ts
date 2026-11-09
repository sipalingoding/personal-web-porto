import { useEffect, useState } from 'react';

function format(): string {
  try {
    return (
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      }).format(new Date()) + ' WIB'
    );
  } catch {
    return '--:-- WIB';
  }
}

/** Current time in Jakarta, e.g. "20:57 WIB", refreshed every 20 seconds. */
export function useJakartaClock(): string {
  const [time, setTime] = useState(format);

  useEffect(() => {
    const id = window.setInterval(() => setTime(format()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  return time;
}
