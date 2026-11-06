// Mobile edition entry (preview: /mobile.html, served by `npm run dev`; not part of the production build yet).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MobileApp from './MobileApp';
import './mobile.css';

createRoot(document.getElementById('root')).render(<StrictMode><MobileApp /></StrictMode>);
