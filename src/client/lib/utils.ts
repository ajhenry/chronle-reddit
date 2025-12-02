import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API configuration for local development
export const getApiBaseUrl = (): string => {
  // Check if we're running in local development mode
  // This can be determined by checking if the current hostname is localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }

  // For production/Devvit mode, use relative URLs
  return '';
};

export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl + endpoint;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      // Don't retry on 200 (success) or 400 (client error)
      if (response.status === 200 || response.status === 400 || attempt === maxRetries) {
        return response;
      }

      // For other status codes, retry after a brief delay
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
      }
    } catch (error) {
      // Network errors - retry if attempts remaining
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Unexpected retry loop exit');
};
