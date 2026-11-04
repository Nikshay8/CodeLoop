import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App.jsx';
import { applyTheme, getInitialTheme } from './utils/theme';

applyTheme(getInitialTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Counts page views and visitors in the Vercel dashboard */}
    <Analytics />
  </StrictMode>,
);