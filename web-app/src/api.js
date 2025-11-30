const API_URL = import.meta.env.PROD 
  ? 'https://session-messenger-backend-production.up.railway.app/api'
  : 'http://localhost:3000/api';

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('sessionToken');
  
  console.log('🔑 API Call:', endpoint, 'Token:', token ? 'Present' : 'Missing');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ API Error:', response.status, data);
    throw new Error(data.error || 'Request failed');
  }
  
  console.log('✅ API Success:', endpoint, data);
  return data;
}

export const auth = {
  create: (displayName) => apiCall('/auth/create', {
    method: 'POST',
    body: JSON.stringify({ displayName })
  }),
  
  login: (accessKey) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ accessKey })
  }),
  
  generateAccountId: () => apiCall('/auth/generate-account-id', {
    method: 'POST'
  }),
  
  connectByAccountId: (accountId) => apiCall('/auth/connect-by-account-id', {
    method: 'POST',
    body: JSON.stringify({ accountId })
  }),
  
  getConnections: () => apiCall('/auth/connections')
};

export const boards = {
  list: () => apiCall('/boards'),
  create: (name, description) => apiCall('/boards', {
    method: 'POST',
    body: JSON.stringify({ name, description })
  })
};
