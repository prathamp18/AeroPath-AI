import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// This finds the <div id="root"> in your HTML
const rootElement = document.getElementById('root');

if (!rootElement) {
    console.error("Failed to find the root element");
} else {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
}