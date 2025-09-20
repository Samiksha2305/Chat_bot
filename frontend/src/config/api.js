// API Configuration for Vite React App
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export { API_URL };

// Example API call function
export const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
};
