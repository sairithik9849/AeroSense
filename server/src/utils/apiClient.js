import axios from 'axios';

const apiClient = axios.create({
  timeout: 30000, // Increased to 30 seconds for slow external APIs
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
