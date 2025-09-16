
import axios from 'axios';

// Base API configuration
const API_BASE_URL = '/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth headers
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Network error occurred';
    throw new Error(message);
  }
);

// Base API instance
const api = {
  get: async (url) => {
    return apiClient.get(url);
  },

  post: async (url, data) => {
    const config = {};
    if (data instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    return apiClient.post(url, data, config);
  },

  put: async (url, data) => {
    return apiClient.put(url, data);
  },

  delete: async (url) => {
    return apiClient.delete(url);
  }
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },

  register: async (userData) => {
    return apiClient.post('/auth/register', userData);
  },

  logout: async () => {
    return apiClient.post('/auth/logout');
  },

  getProfile: async () => {
    return api.get('/auth/profile');
  },

  updateProfile: async (userData) => {
    return api.put('/auth/profile', userData);
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return api.get('/users');
  },

  create: async (userData) => {
    return api.post('/users', userData);
  },

  update: async (id, userData) => {
    return api.put(`/users/${id}`, userData);
  },

  delete: async (id) => {
    return api.delete(`/users/${id}`);
  },
};

// Exhibitions API
export const exhibitionsAPI = {
  getAll: async () => {
    return api.get('/exhibitions');
  },

  getById: async (id) => {
    return api.get(`/exhibitions/${id}`);
  },

  create: async (exhibitionData) => {
    return api.post('/exhibitions', exhibitionData);
  },

  update: async (id, exhibitionData) => {
    return api.put(`/exhibitions/${id}`, exhibitionData);
  },

  delete: async (id) => {
    return api.delete(`/exhibitions/${id}`);
  }
};

// Companies API
export const companiesAPI = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  
  import: async (file) => {
    console.log('🚀🚀🚀 API SERVICE IMPORT CALLED 🚀🚀🚀');
    console.log('🚀 API Service: Starting import with file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      instanceof_File: file instanceof File,
      constructor: file.constructor.name
    });

    // Validate file before creating FormData
    if (!file || !(file instanceof File)) {
      const error = new Error('Invalid file object provided to API import');
      console.error('❌ API Service: Invalid file:', error.message);
      throw error;
    }

    if (file.size === 0) {
      const error = new Error('File is empty');
      console.error('❌ API Service: Empty file:', error.message);
      throw error;
    }

    console.log('📋 API Service: Creating FormData...');
    const formData = new FormData();
    formData.append('excelFile', file);

    console.log('📋 API Service: FormData created successfully:');
    for (let [key, value] of formData.entries()) {
      console.log(`📋   ${key}:`, value);
      if (value instanceof File) {
        console.log(`📋   ${key} file details:`, {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: value.lastModified
        });
      }
    }

    try {
      console.log('🌐 API Service: Preparing POST request to /api/import/companies');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔑 API Service: Token length:', token.length);
      console.log('🌐 API Service: Request URL:', '/api/import/companies');
      console.log('🌐 API Service: Request headers preparation...');

      const response = await fetch('/api/import/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData
      });

      console.log('🌐 API Service: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Array.from(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Service: Error response text:', errorText);
        
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || 'Import failed';
        } catch {
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅✅✅ API SERVICE: IMPORT SUCCESSFUL ✅✅✅');
      console.log('✅ API Service: Import result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌❌❌ API SERVICE: IMPORT FAILED ❌❌❌');
      console.error('❌ API Service: Error type:', error.constructor.name);
      console.error('❌ API Service: Error message:', error.message);
      console.error('❌ API Service: Error stack:', error.stack);
      
      throw error;
    }
  }
};

// Equipment API
export const equipmentAPI = {
  getAll: async () => {
    return api.get('/equipment');
  },

  create: async (equipmentData) => {
    return api.post('/equipment', equipmentData);
  },

  update: async (id, equipmentData) => {
    return api.put(`/equipment/${id}`, equipmentData);
  },

  delete: async (id) => {
    return api.delete(`/equipment/${id}`);
  },
};

// Packages API
export const packagesAPI = {
  getAll: async (exhibitionId) => {
    return api.get(`/packages/exhibition/${exhibitionId}`);
  },

  create: async (packageData) => {
    return api.post('/packages', packageData);
  },

  update: async (id, packageData) => {
    return api.put(`/packages/${id}`, packageData);
  },

  delete: async (id) => {
    return api.delete(`/packages/${id}`);
  },
};

// Bookings API
export const bookingsAPI = {
  getAll: async () => {
    return api.get('/bookings');
  },

  create: async (bookingData) => {
    return api.post('/bookings', bookingData);
  },

  update: async (id, bookingData) => {
    return api.put(`/bookings/${id}`, bookingData);
  },

  delete: async (id) => {
    return api.delete(`/bookings/${id}`);
  },

  updateStatus: async (id, status) => {
    return api.put(`/bookings/${id}/status`, { status });
  },
};

// Statistics API
export const statisticsAPI = {
  getOverview: async () => {
    return api.get('/statistics/overview');
  },

  getReports: async () => {
    return api.get('/reports');
  },
};

// Files API
export const filesAPI = {
  downloadFile: async (fileName) => {
    const response = await apiClient.get(`/download/${fileName}`, {
      responseType: 'blob'
    });
    return response;
  },

  downloadPlanFile: async (fileName) => {
    const response = await apiClient.get(`/download/${fileName}`, {
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadInvoiceFile: async (fileName) => {
    const response = await apiClient.get(`/download/${fileName}?t=${Date.now()}`, {
      responseType: 'blob',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    // Create download link
    const url = window.URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadExpenseFile: async (fileName) => {
    const response = await apiClient.get(`/download/${fileName}?t=${Date.now()}`, {
      responseType: 'blob',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    // Create download link
    const url = window.URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getEventFiles: async (eventId) => {
    return api.get(`/events/${eventId}/files`);
  },

  getEvent: async (eventId) => {
    return api.get(`/annual-services/${eventId}`);
  },

  uploadPlanFile: async (eventId, formData) => {
    return api.post(`/events/${eventId}/upload-plan`, formData);
  },

  uploadInvoiceFile: async (eventId, formData) => {
    return api.post(`/events/${eventId}/upload-invoice`, formData);
  },

  uploadExpenseFile: async (eventId, formData) => {
    return api.post(`/events/${eventId}/upload-expense`, formData);
  },

  uploadInvoiceFiles: async (eventId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('invoice_files', file);
    });

    return api.post(`/events/${eventId}/upload-invoices`, formData);
  },

  uploadExpenseFiles: async (eventId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('expense_files', file);
    });

    return api.post(`/events/${eventId}/upload-expenses`, formData);
  },

  deletePlanFile: async (eventId) => {
    return api.delete(`/events/${eventId}/delete-plan`);
  },

  deleteInvoiceFile: async (eventId, fileName) => {
    return api.delete(`/events/${eventId}/delete-invoice/${fileName}`);
  },

  deleteExpenseFile: async (eventId, fileName) => {
    return api.delete(`/events/${eventId}/delete-expense/${fileName}`);
  },

  // Get file blob for preview
  getFileBlob: async (filePath) => {
    // Clean the path - extract only the filename
    let fileName = filePath;

    // If it's a full path, get just the filename
    if (fileName.includes('/')) {
      fileName = fileName.split('/').pop();
    }

    // If it's a Windows path, get just the filename
    if (fileName.includes('\\')) {
      fileName = fileName.split('\\').pop();
    }

    const response = await apiClient.get(`/download/${fileName}?t=${Date.now()}`, {
      responseType: 'blob',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    return response;
  }
};

export default api;
