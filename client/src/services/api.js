
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

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Base API instance replacement
const api = {
  get: async (url) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  post: async (url, data) => {
    const headers = getAuthHeaders();
    const body = data instanceof FormData ? data : JSON.stringify(data);
    
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    } else {
      delete headers['Content-Type']; // Let browser set multipart boundary
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers,
      body,
    });
    return handleResponse(response);
  },

  put: async (url, data) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (url) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
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
  getAll: async () => {
    try {
      return api.get('/companies');
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },
  
  create: async (companyData) => {
    return api.post('/companies', companyData);
  },
  
  update: async (id, companyData) => {
    return api.put(`/companies/${id}`, companyData);
  },
  
  delete: async (id) => {
    return api.delete(`/companies/${id}`);
  },
  
  import: async (file) => {
    const formData = new FormData();
    formData.append('excelFile', file);
    return api.post('/import/companies', formData);
  },
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
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/download/${fileName}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    return response.blob();
  },

  downloadPlanFile: async (fileName) => {
    const response = await fetch(`${API_BASE_URL}/download/${fileName}`);
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadInvoiceFile: async (fileName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/download/${fileName}?t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadExpenseFile: async (fileName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/download/${fileName}?t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
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
    return api.post(`/events/${eventId}/upload-invoices`, formData);
  },

  uploadExpenseFile: async (eventId, formData) => {
    return api.post(`/events/${eventId}/upload-expenses`, formData);
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
};

export default api;
