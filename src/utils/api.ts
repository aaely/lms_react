import axios from 'axios';
import { token } from '../signals/signals';
import { store } from '../main'

export const api = axios.create({
    baseURL: `http://localhost:8000`,  // Your server's base URL
});

// Add a request interceptor to include the JWT token in the headers
api.interceptors.request.use(
    (config: any) => {
        const tkn = store.get(token)  // Assuming the token is stored in localStorage
        if (tkn) {
            config.headers['Authorization'] = `Bearer ${tkn}`;
        }
        if (config.method === 'post') {
            config.headers['Content-Type'] = 'application/json';
        }
        return config;
    },
    (error: any) => {
        return Promise.reject(error);
    }
);