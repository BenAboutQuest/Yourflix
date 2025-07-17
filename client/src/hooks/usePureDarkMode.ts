import { useState, useEffect } from 'react';

export function usePureDarkMode() {
  const [pureDarkMode, setPureDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved setting on mount
    const savedSettings = localStorage.getItem('yourflixSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.pureDarkMode) {
        setPureDarkMode(true);
        document.body.classList.add('pure-dark-mode');
      }
    }

    // Listen for settings changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'yourflixSettings' && e.newValue) {
        const settings = JSON.parse(e.newValue);
        setPureDarkMode(settings.pureDarkMode || false);
        
        if (settings.pureDarkMode) {
          document.body.classList.add('pure-dark-mode');
        } else {
          document.body.classList.remove('pure-dark-mode');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return pureDarkMode;
}