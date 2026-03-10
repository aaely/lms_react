import axios from 'axios';
import { store } from '../main'
import { trailerApi } from '../../netlify/functions/trailerApi';
import { initialUser, user } from '../signals/signals';

export const api = axios.create({
    baseURL: `http://localhost:8000`,  // Your server's base URL
});

// Add a request interceptor to include the JWT token in the headers
api.interceptors.request.use(
    (config: any) => {
        const u = store.get(user)  // Assuming the token is stored in localStorage
        if (u.accessToken) {
            config.headers['Authorization'] = `Bearer ${u.accessToken}`;
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

export const withTokenRefresh = async <T>(
    apiCall: (token: string) => Promise<T>
): Promise<T> => {
    const currentUser = store.get(user);
    
    try {
        return await apiCall(currentUser.accessToken);
    } catch (error: any) {
        // If not a 401 don't bother refreshing
        console.log(error)
        //if (error?.status !== 401) throw error;
        
        try {
            // Attempt refresh
            const refreshed = await trailerApi.refreshAccessToken(currentUser.refreshToken)
            if (!refreshed) throw new Error('Refresh failed');

            // Update the atom with the new token
            store.set(user, (prev: any) => ({ ...prev, accessToken: refreshed }));

            // Retry the original call with the new token
            return await apiCall(refreshed);
        } catch {
            // Refresh itself failed — force logout
            store.set(user, initialUser);
            throw new Error('Session expired. Please log in again.');
        }
    }
};