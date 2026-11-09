import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles/global.css';
import App from './App';

// Reachable only by typing the URL; nothing on the public site links here.
const DataProject = lazy(() => import('./admin/DataProject'));
const isDataProject = /^\/data-project\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDataProject ? (
      <Suspense fallback={null}>
        <DataProject />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
