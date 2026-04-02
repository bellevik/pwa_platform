import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

if ('serviceWorker' in navigator) {
  const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;
  const serviceWorkerScope = import.meta.env.BASE_URL;
  let reloadedForUpdate = false;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: serviceWorkerScope }).then((registration) => {
      const checkForUpdate = () => {
        void registration.update();
      };

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadedForUpdate) {
          return;
        }

        reloadedForUpdate = true;
        window.location.reload();
      });

      checkForUpdate();
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      });
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
