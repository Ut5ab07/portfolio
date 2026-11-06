// Standalone preview of the Home section: /home.html  (add ?ui=0 to hide the typography and judge the landscape alone).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import HomeSection from './components/HomeSection';
import './styles/global.css';

const ui = new URLSearchParams(window.location.search).get('ui') !== '0';
createRoot(document.getElementById('root')).render(<StrictMode><HomeSection ui={ui} /></StrictMode>);
