import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Company, EntityId } from '../types/procurement';

interface CompanyContextType {
  activeCompany: Company;
  setActiveCompany: (company: Company) => void;
  matchesCompany: (entity: EntityId | 'SHARED' | 'GROUP' | 'FITCO Approved' | 'Arabitra Approved' | 'Joint / Group') => boolean;
  companyLabel: string;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeCompany, setActiveCompany] = useState<Company>('ARABITRA');

  const matchesCompany = (
    _entity: EntityId | 'SHARED' | 'GROUP' | 'FITCO Approved' | 'Arabitra Approved' | 'Joint / Group'
  ): boolean => {
    // Single operating company: Arabitra (Powered by Fitco)
    return true;
  };

  const companyLabel = 'Arabitra';

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, matchesCompany, companyLabel }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
