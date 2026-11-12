import { createContext } from 'react';

/** The theme and the lock, handed down from the dashboard to the lamps and doors in the pictures. */
export const HouseContext = createContext<{ theme: 'light' | 'dark'; onTheme: () => void; onLock: () => void } | null>(null);
