// services/api.js
// This file sets up axios with our backend's base URL
// So we don't have to type the full URL every time we make a request

import axios from 'axios';
import { clearToken, getToken } from '../utils/auth';
import { getUserTimeZone } from '../utils/dateUtils';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create an axios instance with the backend URL already set
const api = axios.create({
  baseURL: API_URL,

  headers: {
    'X-Timezone': getUserTimeZone(),
  },
});

// When several requests fail at the same time (the Dashboard fires two),
// we only want to log the user out and redirect ONCE. This flag guards that.
let isHandlingExpiredSession = false;


api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    // Only react if we actually HAD a token. (Wrong-password login attempts
    // have no token and return 400 from our backend, so they're never affected.)
    const hadToken = Boolean(getToken());

    if (status === 401 && hadToken && !isHandlingExpiredSession) {
      isHandlingExpiredSession = true;

      clearToken();

      window.location.replace('/login');
    }

    // Re-throw so each page's own catch block still runs as before
    return Promise.reject(error);
  }
);

export default api;