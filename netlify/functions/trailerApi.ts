import { type LoginResponse, type TrailerRecord } from "../../src/signals/signals";

const API_BASE = '/.netlify/functions';

export const trailerApi = {
  getTrailers: async (token: string): Promise<{trailers: TrailerRecord[]}> => {
    
    const response = await fetch(`${API_BASE}/get-trailers/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'authorization': `Bearer: ${token}`},
    });
    if (!response.ok) throw new Error('Failed to fetch trailers');
    return response.json();
  },

  getCarryOvers: async (token: string): Promise<{trailers: TrailerRecord[]}> => {
    const response = await fetch(`${API_BASE}/get-carryover/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'authorization': `Bearer: ${token}`},
    });
    if (!response.ok) throw new Error('Failed to fetch carry overs')
    return response.json()
  },

  getOnDeck: async (token: string): Promise<{trailers: TrailerRecord[]}> => {
    const response = await fetch(`${API_BASE}/get-on-deck/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'authorization': `Bearer: ${token}`},
    });
    if (!response.ok) throw new Error('Failed to fetch carry overs')
    return response.json()
  },

  pushOnDeck: async (trailers: TrailerRecord[]): Promise<{trailers: TrailerRecord[]}> => {
    const response = await fetch(`${API_BASE}/push-on-deck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trailers),
    });
    if (!response.ok) throw new Error('Failed to create trailer');
    return response.json();
  },

  createTrailer: async (trailers: TrailerRecord[]): Promise<{message: string, count: number}> => {
    const response = await fetch(`${API_BASE}/create-trailer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trailers),
    });
    if (!response.ok) throw new Error('Failed to create trailer');
    return response.json();
  },

  updateTrailer: async (token: string, uuid: string, trailer: Partial<TrailerRecord>): Promise<TrailerRecord> => {
    const response = await fetch(`${API_BASE}/update-trailer/${uuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization:': `Bearer: ${token}` },
      body: JSON.stringify(trailer),
    });
    if (!response.ok) throw new Error('Failed to update trailer');
    return response.json();
  },

  deleteLiveTrailers: async (token: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/delete-live-trailers/`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'authorization': `Bearer: ${token}`}
    });
    if (!response.ok) throw new Error('Failed to delete trailer');
  },

  getTrailerCount: async (): Promise<{count: number}> => {
    const response = await fetch(`${API_BASE}/get-trailer-count`, {method: 'GET'} )
    if (!response.ok) throw new Error('Failed to get count')
      return response.json()
  },

  register: async (username: string, password: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    })
    if (!response.ok) throw new Error('Failed to get token') 
      return response.json()
  },

  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    })
    if (!response.ok) throw new Error('Failed to get token') 
      return response.json()
  }
};