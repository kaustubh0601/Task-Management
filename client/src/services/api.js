import axios from 'axios';

// Create axios instance with base URL
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://task-management-blue-xi.vercel.app/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
API.interceptors.request.use(
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

// Response interceptor to handle common errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    }
    
    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  // Register new user
  register: (userData) => API.post('/auth/register', userData),
  
  // Login user
  login: (credentials) => API.post('/auth/login', credentials),
  
  // Get current user profile
  getProfile: () => API.get('/auth/me'),
  
  // Update user profile
  updateProfile: (data) => API.put('/auth/profile', data),
};

// Tasks API calls
export const tasksAPI = {
  // Get all tasks with pagination and filters
  getTasks: (params = {}) => API.get('/tasks', { params }),
  
  // Get single task by ID
  getTask: (id) => API.get(`/tasks/${id}`),
  
  // Create new task
  createTask: (taskData) => API.post('/tasks', taskData),
  
  // Update task
  updateTask: (id, taskData) => API.put(`/tasks/${id}`, taskData),
  
  // Update task status only
  updateTaskStatus: (id, status) => API.patch(`/tasks/${id}/status`, { status }),
  
  // Delete task
  deleteTask: (id) => API.delete(`/tasks/${id}`),
  
  // Get tasks by priority
  getTasksByPriority: (priority) => API.get(`/tasks/priority/${priority}`),
};

// Users API calls (Admin only)
export const usersAPI = {
  // Get all users (admin only)
  getUsers: (params = {}) => API.get('/users', { params }),
  
  // Get single user by ID (admin only)
  getUser: (id) => API.get(`/users/${id}`),
  
  // Create new user (admin only)
  createUser: (userData) => API.post('/users', userData),
  
  // Update user (admin only)
  updateUser: (id, userData) => API.put(`/users/${id}`, userData),
  
  // Delete user (admin only)
  deleteUser: (id) => API.delete(`/users/${id}`),
  
  // Get users for assignment dropdown
  getUsersForAssignment: () => API.get('/users/for-assignment'),
};

export default API;