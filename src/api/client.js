import axios from 'axios';
import Constants from 'expo-constants';
import { getItem } from '../utils/storage';

const apiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl || '';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000, // fail predictably instead of letting a bad connection hang the loader forever
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// Mirrors the web app's src/apis/index.js request interceptor: attach the
// bearer token to every outgoing request unless explicitly opted out.
apiClient.interceptors.request.use(async (config) => {
  if (config.skipAuthTokenAttach) {
    return config;
  }
  const token = await getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
