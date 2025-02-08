import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  richColors: boolean;
  setRichColors: (richColors: boolean) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  richColors: true, // Default: toast colorati
  setRichColors: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
                                children,
                                defaultTheme = "system",
                                storageKey = "vite-ui-theme",
                                ...props
                              }: ThemeProviderProps) {

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Stato di richColors per i toast
  const [richColors, setRichColors] = useState<boolean>(
    () => localStorage.getItem("richColors") === "true"
  );

  // Effetto per aggiornare la classe del tema
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Effetto per salvare richColors nel localStorage
  useEffect(() => {
    localStorage.setItem("richColors", String(richColors));
  }, [richColors]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    richColors,
    setRichColors: (value: boolean) => {
      localStorage.setItem("richColors", String(value));
      setRichColors(value);
    },
  };

  return (
    <ThemeProviderContext.Provider { ...props } value={ value }>
      { children }
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
