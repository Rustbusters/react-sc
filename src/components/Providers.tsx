import { Toaster } from "react-hot-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { AppSidebar } from "@/components/AppSidebar.tsx";
import { SimulationStatusIndicator } from "@/components/SimulationStatusIndicator.tsx";
import { Raycast } from "@/components/CommandPalette.tsx";
import { SimulationProvider } from "@/components/SimulationContext.tsx";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimulationProvider>
        <SidebarProvider>
          <AppSidebar/>
          <main className="w-screen h-screen flex flex-col">
            <div className="w-full py-2 flex flex-row justify-between items-center">
              <SidebarTrigger/>
              <SimulationStatusIndicator/>
            </div>
            { children }
          </main>
        </SidebarProvider>
        <Raycast/>
        <Toaster/>
      </SimulationProvider>
    </>
  );
}
