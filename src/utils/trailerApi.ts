import { type TrailerRecord } from "../signals/signals";

const API_BASE = '/.netlify/functions';

export const trailerApi = {
  // Get all trailers, optionally filtered by dock code
  getTrailers: async (dockCode?: string): Promise<TrailerRecord[]> => {
    const url = dockCode 
      ? `${API_BASE}/get-trailers?dockCode=${dockCode}`
      : `${API_BASE}/get-trailers`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch trailers');
    return response.json();
  },

  // Create a new trailer
  createTrailer: async (trailer: TrailerRecord): Promise<TrailerRecord> => {
    const response = await fetch(`${API_BASE}/create-trailer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trailer),
    });
    if (!response.ok) throw new Error('Failed to create trailer');
    return response.json();
  },

  // Update an existing trailer
  updateTrailer: async (uuid: string, trailer: Partial<TrailerRecord>): Promise<TrailerRecord> => {
    const response = await fetch(`${API_BASE}/update-trailer/${uuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trailer),
    });
    if (!response.ok) throw new Error('Failed to update trailer');
    return response.json();
  },

  // Delete a trailer
  deleteTrailer: async (uuid: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/delete-trailer/${uuid}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete trailer');
  },
};