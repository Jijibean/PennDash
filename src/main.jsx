import React from 'react'
import ReactDOM from 'react-dom/client'
import PennDash from './PennDash.jsx'

// Mock storage for local development (simulates the persistent storage API)
if (!window.storage) {
  const localStore = {};
  window.storage = {
    get: async (key, shared) => {
      const storeKey = shared ? `shared:${key}` : key;
      const value = localStorage.getItem(storeKey);
      return value ? { key, value, shared } : null;
    },
    set: async (key, value, shared) => {
      const storeKey = shared ? `shared:${key}` : key;
      localStorage.setItem(storeKey, value);
      return { key, value, shared };
    },
    delete: async (key, shared) => {
      const storeKey = shared ? `shared:${key}` : key;
      localStorage.removeItem(storeKey);
      return { key, deleted: true, shared };
    },
    list: async (prefix, shared) => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return { keys, prefix, shared };
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PennDash />
  </React.StrictMode>,
)
