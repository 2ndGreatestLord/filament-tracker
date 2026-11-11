import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { migrateLegacyPhotos } from './db/migrations';
import { requestPersistentStorage } from './db/persist';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

requestPersistentStorage();
void migrateLegacyPhotos().catch(() => undefined);

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
