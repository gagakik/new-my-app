
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
};

// Companies API
export const companiesAPI = {
  getAll: async () => {
    const response = await api.get('/companies');
    return response.data;
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

export default api;
