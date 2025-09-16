import React, { createContext, useContext, useState, useCallback } from 'react';

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: any[];
  isSearching: boolean;
  performSearch: (term: string) => Promise<void>;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
};

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Import the API dynamically to avoid circular dependencies
      const { api } = await import('@/lib/api');
      const estimations = await api.estimations.list();
      
      // Filter results based on search term (case-insensitive, partial matching)
      const filtered = estimations.filter((estimation: any) => {
        const searchLower = term.toLowerCase();
        const title = (estimation.title || '').toLowerCase();
        const client = (estimation.client_name || '').toLowerCase();
        const status = (estimation.status || '').toLowerCase();
        
        return title.includes(searchLower) || 
               client.includes(searchLower) || 
               status.includes(searchLower);
      });
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  return (
    <SearchContext.Provider value={{
      searchTerm,
      setSearchTerm,
      searchResults,
      isSearching,
      performSearch,
      clearSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
};
