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
  const [activeCompany, setActiveCompany] = useState<Company>('ALL');

  const matchesCompany = (
    entity: EntityId | 'SHARED' | 'GROUP' | 'FITCO Approved' | 'Arabitra Approved' | 'Joint / Group'
  ): boolean => {
    if (activeCompany === 'ALL') return true;
    if (entity === 'SHARED' || entity === 'GROUP' || entity === 'Joint / Group') return true;
    if (activeCompany === 'FITCO') {
      return entity === 'FITCO' || entity === 'FITCO Approved';
    }
    if (activeCompany === 'ARABITRA') {
      return entity === 'ARABITRA' || entity === 'Arabitra Approved';
    }
    return true;
  };

  const companyLabel =
    activeCompany === 'FITCO'
      ? 'FITCO Industrial & EPC'
      : activeCompany === 'ARABITRA'
      ? 'Arabitra Infrastructure'
      : 'All Companies (Consolidated)';

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
