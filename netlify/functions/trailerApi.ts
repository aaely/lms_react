import { type TrailerRecord } from "../../src/signals/signals";

const API_BASE = '/.netlify/functions';

export const trailerApi = {
  getTrailers: async (): Promise<{trailers: TrailerRecord[]}> => {
    const url = `${API_BASE}/get-trailers`
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch trailers');
    return response.json();
  },

  getCarryOvers: async (): Promise<{trailers: TrailerRecord[]}> => {
    const url = `${API_BASE}/get-carryover`

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch carry overs')
    return response.json()
  },

  getOnDeck: async (): Promise<{trailers: TrailerRecord[]}> => {
    const url = `${API_BASE}/get-on-deck`

    const response = await fetch(url);
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

  getTrailerCount: async (): Promise<{count: number}> => {
    const response = await fetch(`${API_BASE}/get-trailer-count`)
    if (!response.ok) throw new Error('Failed to get count')
      return response.json()
  }
};