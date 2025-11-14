/**
 * Axios instance with base configuration
 * Centralized API client for all API calls
 */

import axios from 'axios';
import { CONFIG } from '../../config/config';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Include credentials (cookies) for Laravel Sanctum
  withCredentials: true,
});

// Request interceptor (runs before every request)
axiosInstance.interceptors.request.use(
  (config) => {
    // TODO: can add auth tokens here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (runs after every response)
axiosInstance.interceptors.response.use(
  (response) => {
    // Success - just return the data
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      // Handle 401 Unauthorized (session expired)
      if (status === 401) {
        console.error('Unauthorized - session may have expired');
        // TODO: can redirect to login here if needed
        // window.location.href = '/';
      }
      
      // Handle 403 Forbidden
      if (status === 403) {
        console.error('Forbidden - insufficient permissions');
      }
      
      // Handle 500 Server Error
      if (status === 500) {
        console.error('Server error:', data);
      }
    } else if (error.request) {
      // Request made but no response (network error)
      console.error('Network error - no response from server');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

