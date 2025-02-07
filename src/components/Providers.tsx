// import { Toaster } from "react-hot-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { AppSidebar } from "@/components/AppSidebar.tsx";
import { SimulationStatusIndicator } from "@/components/SimulationStatusIndicator.tsx";
import { Raycast } from "@/components/CommandPalette.tsx";
import { SimulationProvider } from "@/components/SimulationContext.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";
import { ThemeProvider, useTheme } from "@/components/theme-provider.tsx";
import React, { useEffect } from "react";
import { ModeToggle } from "@/components/ModeToggle.tsx";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimulationProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <ThemeShortcuts/>
          <SidebarProvider>
            <div className="flex w-screen h-screen overflow-hidden">
              <AppSidebar/>
              <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="w-full py-2 flex flex-row justify-between items-center">
                  <SidebarTrigger/>
                  <div className="flex items-center gap-2 px-2">
                    <SimulationStatusIndicator/>
                    <ModeToggle/>
                  </div>
                </div>
                { children }
              </main>
            </div>
          </SidebarProvider>
          <Raycast/>
          <ToasterWrapper/>
        </ThemeProvider>
      </SimulationProvider>
    </>
  );
}


const ToasterWrapper = () => {
  const { richColors } = useTheme();
  return <Toaster richColors={ richColors }/>;
};


const ThemeShortcuts = () => {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "t") {
        event.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [theme, setTheme]);

  return null;
};