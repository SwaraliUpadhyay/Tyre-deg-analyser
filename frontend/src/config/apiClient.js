import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Get API URL from environment variable or default
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Create axios instance with base URL
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
