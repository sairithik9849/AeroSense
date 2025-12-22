// API configuration for development and production environments
export const getApiUrl = () => {
  // In production (Vercel), API routes are on same origin
  // In development, use the proxy (relative paths work with Vite proxy)
  if (import.meta.env.PROD) {
    return ''; // Same origin - use relative paths
  }
  
  // Development: Vite proxy handles /api routes
  return '';
};

export const getApiEndpoint = (path) => {
  const apiUrl = getApiUrl();
  return `${apiUrl}${path}`;
};
