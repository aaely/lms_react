import axios from 'axios';
import { store } from '../main'
import { initialUser, user } from '../signals/signals';

export const api = axios.create({
    baseURL: `http://localhost:8000`,
    withCredentials: true,
});

export const logout = async () => {
    try {
        await api.post('/api/logout')
    } catch {

    }
    store.set(user, initialUser)
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error?.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                await api.post('/api/refresh')
                return api(originalRequest)
            } catch {
                await logout()
                return Promise.reject(error instanceof Error ? error : 'Unknown error during token refresh')
            }
        }

        return Promise.reject(error)
    }
)
