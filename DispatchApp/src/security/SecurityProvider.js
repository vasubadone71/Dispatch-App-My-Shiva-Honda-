import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkLicenseState, LICENSE_STATUS } from '../licensing/licenseManager';
import { checkEnvironmentSafety } from './antiPiracy';

const SecurityContext = createContext(null);

export const SecurityProvider = ({ children }) => {
  const [appState,      setAppState]      = useState(LICENSE_STATUS.LOADING);
  const [dealerProfile, setDealerProfile] = useState(null);
  const [lockError,     setLockError]     = useState('');

  const evaluateSecurity = async () => {
    setAppState(LICENSE_STATUS.LOADING);
    try {
      const safety = await checkEnvironmentSafety();
      if (!safety.safe) {
        setAppState(LICENSE_STATUS.UNAUTHORIZED_DEVICE);
        setLockError(safety.details || 'Environment safety check failed.');
        return;
      }

      const result = await checkLicenseState();
      setAppState(result.status);
      setDealerProfile(result.profile || null);
      setLockError(result.error || '');
    } catch (err) {
      console.error('[SecurityProvider] evaluateSecurity error:', err);
      setAppState(LICENSE_STATUS.UNLICENSED);
    }
  };

  useEffect(() => { evaluateSecurity(); }, []);

  const handleNavigateToCode = () => setAppState(LICENSE_STATUS.PENDING_CODE);
  const handleGoBack         = () => setAppState(LICENSE_STATUS.UNLICENSED);
  const handleReset          = () => { setDealerProfile(null); setLockError(''); setAppState(LICENSE_STATUS.UNLICENSED); };
  const handleActivated      = (profile) => { setDealerProfile(profile); setAppState(LICENSE_STATUS.VALID); };

  return (
    <SecurityContext.Provider value={{ 
      appState, 
      dealerProfile, 
      lockError, 
      reevaluate: evaluateSecurity,
      handleNavigateToCode,
      handleGoBack,
      handleReset,
      handleActivated
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within <SecurityProvider>');
  return ctx;
};
