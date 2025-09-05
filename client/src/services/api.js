
import axios from 'axios';

// Base API instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - ავტომატურად ამატებს ტოკენს
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - ავტომატურად ამუშავებს შეცდომებს
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // ავტორიზაციის შეცდომის შემთხვევაში
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },
  
  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  create: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  
  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Services API
export const servicesAPI = {
  getAll: async () => {
    const response = await api.get('/annual-services');
    return response.data;
  },
  
  getExhibitions: async () => {
    const response = await api.get('/exhibitions');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/annual-services/${id}`);
    return response.data;
  },
  
  getDetails: async (id) => {
    const response = await api.get(`/annual-services/${id}/details`);
    return response.data;
  },
  
  create: async (serviceData) => {
    const response = await api.post('/annual-services', serviceData);
    return response.data;
  },
  
  update: async (id, serviceData) => {
    const response = await api.put(`/annual-services/${id}`, serviceData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/annual-services/${id}`);
    return response.data;
  },
  
  archive: async (id) => {
    const response = await api.put(`/annual-services/${id}/archive`);
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await api.post('/annual-services', eventData);
    return response.data;
  },

  updateEvent: async (id, eventData) => {
    const response = await api.put(`/annual-services/${id}`, eventData);
    return response.data;
  },

  restoreEvent: async (id) => {
    const response = await api.put(`/annual-services/${id}/restore`);
    return response.data;
  },
};

// Companies API
export const companiesAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/companies');
      return response.data;
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },
  
  create: async (companyData) => {
    const response = await api.post('/companies', companyData);
    return response.data;
  },
  
  update: async (id, companyData) => {
    const response = await api.put(`/companies/${id}`, companyData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
  },
  
  import: async (file) => {
    const formData = new FormData();
    formData.append('excelFile', file);
    const response = await api.post('/import/companies', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Equipment API
export const equipmentAPI = {
  getAll: async () => {
    const response = await api.get('/equipment');
    return response.data;
  },
  
  create: async (equipmentData) => {
    const response = await api.post('/equipment', equipmentData);
    return response.data;
  },
  
  update: async (id, equipmentData) => {
    const response = await api.put(`/equipment/${id}`, equipmentData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/equipment/${id}`);
    return response.data;
  },
};

// Packages API
export const packagesAPI = {
  getAll: async (exhibitionId) => {
    const response = await api.get(`/packages/exhibition/${exhibitionId}`);
    return response.data;
  },
  
  create: async (packageData) => {
    const response = await api.post('/packages', packageData);
    return response.data;
  },
  
  update: async (id, packageData) => {
    const response = await api.put(`/packages/${id}`, packageData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/packages/${id}`);
    return response.data;
  },
};

// Statistics API
export const statisticsAPI = {
  getOverview: async () => {
    const response = await api.get('/statistics/overview');
    return response.data;
  },
  
  getReports: async () => {
    const response = await api.get('/reports');
    return response.data;
  },
};

// Files API
export const filesAPI = {
  downloadPlanFile: async (fileName) => {
    const response = await api.get(`/download/${fileName}`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadInvoiceFile: async (fileName) => {
    const response = await api.get(`/download/${fileName}`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadExpenseFile: async (fileName) => {
    const response = await api.get(`/download/${fileName}`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getEventFiles: async (eventId) => {
    const response = await api.get(`/events/${eventId}/files`);
    return response.data;
  },

  uploadPlanFile: async (eventId, file) => {
    const formData = new FormData();
    formData.append('plan_file', file);
    
    const response = await api.post(`/events/${eventId}/upload-plan`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadInvoiceFiles: async (eventId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('invoice_files', file);
    });
    
    const response = await api.post(`/events/${eventId}/upload-invoices`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadExpenseFiles: async (eventId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('expense_files', file);
    });
    
    const response = await api.post(`/events/${eventId}/upload-expenses`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadFile: async (fileName) => {
    const token = localStorage.getItem('token');
    const response = await api.get(`/download/${fileName}`, {
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  },

  deletePlanFile: async (eventId) => {
    const response = await api.delete(`/events/${eventId}/delete-plan`);
    return response.data;
  },

  deleteInvoiceFile: async (eventId, fileName) => {
    const response = await api.delete(`/events/${eventId}/delete-invoice/${encodeURIComponent(fileName)}`);
    return response.data;
  },

  deleteExpenseFile: async (eventId, fileName) => {
    const response = await api.delete(`/events/${eventId}/delete-expense/${encodeURIComponent(fileName)}`);
    return response.data;
  }
};

export default api;
