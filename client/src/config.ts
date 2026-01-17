export const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment
    ? 'http://localhost:3000/api/v1'
    : '/api/v1';
