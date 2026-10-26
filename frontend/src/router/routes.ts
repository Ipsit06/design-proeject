export const ROUTES = {
  DASHBOARD: '/',
  TRANSLATOR: '/translator',
  COLLECT: '/collect',
  TRAIN: '/train',
  EVALUATE: '/evaluate',
  HISTORY: '/history',
  GESTURES: '/gestures',
  ABOUT: '/about',
  SETTINGS: '/settings',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
