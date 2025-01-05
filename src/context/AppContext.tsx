import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
interface DesignItem {
  id: string;
  imageUrl: string;
  tags: string[];
  dateAdded: string;
  description?: string;
}

interface CompanyInfo {
  name: string;
  logo?: string;
}

interface AppContextType {
  companyInfo: CompanyInfo;
  designs: DesignItem[];
  inspirations: DesignItem[];
  updateCompanyInfo: (info: CompanyInfo) => void;
  addDesign: (design: Omit<DesignItem, 'id' | 'dateAdded'>) => void;
  addInspiration: (inspiration: Omit<DesignItem, 'id' | 'dateAdded'>) => void;
  removeDesign: (id: string) => void;
  removeInspiration: (id: string) => void;
}

// Initial dummy data
const initialCompanyInfo: CompanyInfo = {
  name: 'LYZMA CREATIONS',
  logo: undefined,
};

const initialDesigns: DesignItem[] = [
];

const initialInspirations: DesignItem[] = [
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialCompanyInfo);
  const [designs, setDesigns] = useState<DesignItem[]>(initialDesigns);
  const [inspirations, setInspirations] = useState<DesignItem[]>(initialInspirations);

  const updateCompanyInfo = (info: CompanyInfo) => {
    setCompanyInfo(info);
  };

  const addDesign = (design: Omit<DesignItem, 'id' | 'dateAdded'>) => {
    const newDesign: DesignItem = {
      ...design,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setDesigns(prev => [newDesign, ...prev]);
  };

  const addInspiration = (inspiration: Omit<DesignItem, 'id' | 'dateAdded'>) => {
    const newInspiration: DesignItem = {
      ...inspiration,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setInspirations(prev => [newInspiration, ...prev]);
  };

  const removeDesign = (id: string) => {
    setDesigns(prev => prev.filter(design => design.id !== id));
  };

  const removeInspiration = (id: string) => {
    setInspirations(prev => prev.filter(inspiration => inspiration.id !== id));
  };

  return (
    <AppContext.Provider 
      value={{ 
        companyInfo, 
        designs, 
        inspirations,
        updateCompanyInfo,
        addDesign,
        addInspiration,
        removeDesign,
        removeInspiration
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
