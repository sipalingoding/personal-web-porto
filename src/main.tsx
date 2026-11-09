import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles/global.css';
import App from './App';

// Reachable only by typing the URL; nothing on the public site links here.
const DataProject = lazy(() => import('./admin/DataProject'));
const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const path = window.location.pathname;
const isDataProject = /^\/data-project\/?$/.test(path);
const isDashboard = /^\/mydashboard(\/[a-z0-9-]+)*\/?$/.test(path);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDataProject || isDashboard ? (
      <Suspense fallback={null}>{isDashboard ? <Dashboard /> : <DataProject />}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
