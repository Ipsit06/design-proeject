import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.js';
import { ROUTES } from './routes.js';
import { Dashboard } from '../pages/Dashboard.js';
import { History } from '../pages/History.js';
import { GestureLibrary } from '../pages/GestureLibrary.js';
import { About } from '../pages/About.js';
import { Settings } from '../pages/Settings.js';
import { DataCollection } from '../pages/DataCollection.js';
import { ModelTraining } from '../pages/ModelTraining.js';
import { Evaluation } from '../pages/Evaluation.js';
import { NotFound } from '../pages/NotFound.js';
import { Spinner } from '../components/ui/Spinner.js';

// Lazy-load Translator as specified in prompt (MediaPipe is heavy)
const Translator = lazy(() => import('../pages/Translator.js'));

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Spinner size="lg" className="text-forest" />
      <p className="text-sm text-ink-secondary font-medium">
        Loading module components...
      </p>
    </div>
  );
}

function RouteErrorBoundary() {
  return (
    <div className="p-8 max-w-xl mx-auto my-12 bg-card border border-status-error/30 rounded-card text-center space-y-4">
      <h2 className="text-xl font-bold text-ink">An unexpected error occurred</h2>
      <p className="text-sm text-ink-secondary">
        This view encountered an error while rendering. Please reload the page or navigate back to the dashboard.
      </p>
      <a
        href="/"
        className="inline-flex items-center justify-center font-medium rounded-btn text-sm px-4 py-2 bg-forest text-white"
      >
        Reload to Dashboard
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: ROUTES.TRANSLATOR.replace(/^\//, ''),
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Translator />
          </Suspense>
        ),
      },
      {
        path: ROUTES.COLLECT.replace(/^\//, ''),
        element: <DataCollection />,
      },
      {
        path: ROUTES.TRAIN.replace(/^\//, ''),
        element: <ModelTraining />,
      },
      {
        path: ROUTES.EVALUATE.replace(/^\//, ''),
        element: <Evaluation />,
      },
      {
        path: ROUTES.HISTORY.replace(/^\//, ''),
        element: <History />,
      },
      {
        path: ROUTES.GESTURES.replace(/^\//, ''),
        element: <GestureLibrary />,
      },
      {
        path: ROUTES.ABOUT.replace(/^\//, ''),
        element: <About />,
      },
      {
        path: ROUTES.SETTINGS.replace(/^\//, ''),
        element: <Settings />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
