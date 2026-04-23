import axios from 'axios';
import { store } from '../main'
import { initialUser, user } from '../signals/signals';

export const api = axios.create({
    baseURL: `http://localhost:8000`,
});

api.interceptors.request.use(
    (config: any) => {
        const u = store.get(user)
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

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        // Avoid infinite retry loop
        if (error?.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const currentUser = store.get(user)
                const refreshed = await api.post('/refresh', { refresh_token: currentUser.refreshToken })
                const newToken = refreshed.data.token

                if (!newToken) throw new Error('Refresh failed')

                store.set(user, (prev: any) => ({ ...prev, accessToken: newToken }))

                originalRequest.headers['Authorization'] = `Bearer ${newToken}`
                return api(originalRequest)
            } catch {
                store.set(user, initialUser)
                throw new Error('Session expired. Please log in again.')
            }
        }

        return Promise.reject(error)
    }
)