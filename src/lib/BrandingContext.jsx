import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/api/apiClient';
import { applyThemeFromColors, resetThemeToDefault } from '@/lib/theme/applyTheme';

const DEFAULT_NAME = 'DS Estética Auto';
const DEFAULT_TAGLINE = 'Estética Automotiva';
const DEFAULT_LOGO = `${import.meta.env.BASE_URL}brand/logo-ds.jpg`;

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBranding = useCallback(async () => {
    try {
      const configs = await api.entities.BusinessConfig.list();
      const current = configs[0] || null;
      setConfig(current);

      if (current?.theme_colors) {
        applyThemeFromColors(current.theme_colors);
      } else {
        resetThemeToDefault();
      }
    } catch (e) {
      console.error(e);
      resetThemeToDefault();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranding();
    window.addEventListener('ds-estetica-data-changed', loadBranding);
    return () => window.removeEventListener('ds-estetica-data-changed', loadBranding);
  }, [loadBranding]);

  const businessName = config?.business_name || DEFAULT_NAME;
  const businessTagline = config?.business_tagline || DEFAULT_TAGLINE;
  const logoUrl = config?.business_logo_url || DEFAULT_LOGO;
  const businessAddress = config?.address || '';
  const businessPhone = config?.phone || config?.whatsapp || '';
  const ownerName = config?.owner_name || '';

  return (
    <BrandingContext.Provider
      value={{
        config,
        loading,
        businessName,
        businessTagline,
        logoUrl,
        businessAddress,
        businessPhone,
        ownerName,
        themePreset: config?.theme_preset || 'classico',
        themeColors: config?.theme_colors || null,
        refresh: loadBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}
