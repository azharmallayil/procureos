import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { ThemeStyle, ThemeMode, UserThemeConfig } from '../types/procurement';

interface ThemeContextType {
  themeStyle: ThemeStyle;
  themeMode: ThemeMode;
  themeConfig: UserThemeConfig;
  setThemeStyle: (style: ThemeStyle) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setTheme: (style: ThemeStyle, mode: ThemeMode) => void;
}

const DEFAULT_THEME: UserThemeConfig = {
  style: 'default',
  mode: 'dark',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeToDom(style: ThemeStyle, mode: ThemeMode) {
  const root = document.documentElement;

  // Set data attributes
  root.setAttribute('data-theme-style', style);
  root.setAttribute('data-theme-mode', mode);

  // Set style classes
  root.classList.remove('theme-default', 'theme-glass', 'theme-clean');
  root.classList.add(`theme-${style}`);

  // Set mode classes
  root.classList.remove('dark', 'light');
  root.classList.add(mode);

  // Set color scheme meta or property
  root.style.colorScheme = mode;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, updateUser } = useAuth();

  const [themeConfig, setThemeConfig] = useState<UserThemeConfig>(() => {
    // Check initial fallback
    try {
      const active = localStorage.getItem('procureos_active_theme');
      if (active) {
        const parsed = JSON.parse(active);
        if (parsed?.style && parsed?.mode) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_THEME;
  });

  // When currentUser changes (login, switch user, logout), load that specific user's saved theme
  useEffect(() => {
    if (currentUser?.email) {
      const userKey = `procureos_theme_${currentUser.email.trim().toLowerCase()}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.style && parsed?.mode) {
            setThemeConfig(parsed);
            applyThemeToDom(parsed.style, parsed.mode);
            localStorage.setItem('procureos_active_theme', JSON.stringify(parsed));
            return;
          }
        } catch {}
      }

      // Check user record profile
      if (currentUser.theme?.style && currentUser.theme?.mode) {
        setThemeConfig(currentUser.theme);
        applyThemeToDom(currentUser.theme.style, currentUser.theme.mode);
        localStorage.setItem(userKey, JSON.stringify(currentUser.theme));
        localStorage.setItem('procureos_active_theme', JSON.stringify(currentUser.theme));
        return;
      }

      // Default for this user if no previous preference
      setThemeConfig(DEFAULT_THEME);
      applyThemeToDom(DEFAULT_THEME.style, DEFAULT_THEME.mode);
      localStorage.setItem(userKey, JSON.stringify(DEFAULT_THEME));
      localStorage.setItem('procureos_active_theme', JSON.stringify(DEFAULT_THEME));
    } else {
      // Pre-login state: apply last active or default
      applyThemeToDom(themeConfig.style, themeConfig.mode);
    }
  }, [currentUser?.email]);

  // Unified theme setter
  const setTheme = useCallback(
    (style: ThemeStyle, mode: ThemeMode) => {
      const next: UserThemeConfig = { style, mode };
      setThemeConfig(next);
      applyThemeToDom(style, mode);

      // Save to global active fallback
      localStorage.setItem('procureos_active_theme', JSON.stringify(next));

      // Persist per user
      if (currentUser?.email) {
        const userKey = `procureos_theme_${currentUser.email.trim().toLowerCase()}`;
        localStorage.setItem(userKey, JSON.stringify(next));

        // Sync with user profile store in background
        if (currentUser.id) {
          updateUser(currentUser.id, { theme: next }).catch((err) => {
            console.warn('[Theme] Could not sync theme preference to user profile store:', err);
          });
        }
      }
    },
    [currentUser, updateUser]
  );

  const setThemeStyle = useCallback(
    (style: ThemeStyle) => {
      setTheme(style, themeConfig.mode);
    },
    [themeConfig.mode, setTheme]
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setTheme(themeConfig.style, mode);
    },
    [themeConfig.style, setTheme]
  );

  const toggleThemeMode = useCallback(() => {
    const nextMode: ThemeMode = themeConfig.mode === 'dark' ? 'light' : 'dark';
    setTheme(themeConfig.style, nextMode);
  }, [themeConfig.style, themeConfig.mode, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        themeStyle: themeConfig.style,
        themeMode: themeConfig.mode,
        themeConfig,
        setThemeStyle,
        setThemeMode,
        toggleThemeMode,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
