"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeColor = "violet" | "emerald" | "blue" | "rose" | "amber" | "slate";

interface ThemeContextProps {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  themeColor: "violet",
  setThemeColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const colorMap: Record<ThemeColor, { primary: string; hover: string }> = {
  violet: { primary: "#8b5cf6", hover: "#7c3aed" },
  emerald: { primary: "#10b981", hover: "#059669" },
  blue: { primary: "#3b82f6", hover: "#2563eb" },
  rose: { primary: "#f43f5e", hover: "#e11d48" },
  amber: { primary: "#f59e0b", hover: "#d97706" },
  slate: { primary: "#64748b", hover: "#475569" },
};

export const ColorThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>("violet");

  useEffect(() => {
    const saved = localStorage.getItem("zenjoy-theme") as ThemeColor;
    if (saved && colorMap[saved]) {
      setThemeColorState(saved);
    }
  }, []);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem("zenjoy-theme", color);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent-primary", colorMap[themeColor].primary);
    root.style.setProperty("--accent-primary-hover", colorMap[themeColor].hover);
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};
