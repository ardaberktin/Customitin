import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/media.css';
import './styles/library.css';
import './styles/assistant.css';
createRoot(document.getElementById('root')!).render(<App />);
