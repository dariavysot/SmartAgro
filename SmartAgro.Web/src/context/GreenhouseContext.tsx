import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Greenhouse } from '../types/greenhouse';
import { useAuth } from './AuthContext';

interface GreenhouseContextType {
  greenhouses: Greenhouse[];
  selectedGreenhouse: Greenhouse | null;
  setSelectedGreenhouseId: (id: string) => void;
  isLoading: boolean;
  refreshGreenhouses: () => Promise<void>;
}

const GreenhouseContext = createContext<GreenhouseContextType | undefined>(undefined);

const STORAGE_KEY = 'smartagro_selected_greenhouse_id';
const API_BASE_URL = 'http://localhost:5000/api'; // або URL вашого API бекенду

export const GreenhouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<Greenhouse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchGreenhouses = async () => {
    if (!isAuthenticated) {
      setGreenhouses([]);
      setSelectedGreenhouse(null);
      return;
    }

    try {
      setIsLoading(true);
      const endpoint = user?.role === 'Admin' ? '/greenhouses/all' : '/greenhouses/my';
      const token = localStorage.getItem('smartagro_access_token');

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Greenhouse[] = await response.json();
      setGreenhouses(data || []);

      if (data && data.length > 0) {
        const savedId = localStorage.getItem(STORAGE_KEY);
        const matched = data.find((g: Greenhouse) => g.id === savedId);
        const current = matched || data[0];
        setSelectedGreenhouse(current);
        localStorage.setItem(STORAGE_KEY, current.id);
      } else {
        setSelectedGreenhouse(null);
      }
    } catch (error) {
      console.error('Помилка завантаження теплиць:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGreenhouses();
  }, [isAuthenticated, user?.role]);

  const setSelectedGreenhouseId = (id: string) => {
    const found = greenhouses.find((g: Greenhouse) => g.id === id);
    if (found) {
      setSelectedGreenhouse(found);
      localStorage.setItem(STORAGE_KEY, found.id);
    }
  };

  return (
    <GreenhouseContext.Provider
      value={{
        greenhouses,
        selectedGreenhouse,
        setSelectedGreenhouseId,
        isLoading,
        refreshGreenhouses: fetchGreenhouses,
      }}
    >
      {children}
    </GreenhouseContext.Provider>
  );
};

export const useGreenhouse = () => {
  const context = useContext(GreenhouseContext);
  if (!context) {
    throw new Error('useGreenhouse must be used within GreenhouseProvider');
  }
  return context;
};