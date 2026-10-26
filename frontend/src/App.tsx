import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/index.js';
import { ToastProvider } from './components/ui/Toast.js';

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export default App;
