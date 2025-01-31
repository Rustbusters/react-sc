import { Toaster } from "react-hot-toast";
import { SingletonTabProvider } from "@/components/SingletonTabProvider";
import { Raycast } from "@/components/CommandPalette.tsx";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { AppSidebar } from "@/components/AppSidebar.tsx";
import { Button } from "@/components/ui/button.tsx";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SingletonTabProvider/>
      <SidebarProvider>
        <AppSidebar/>
        <main className="w-screen h-screen flex flex-col">
          <div className="w-full py-2 flex flex-row justify-between items-center">
            <SidebarTrigger/>
            <Button variant="ghost" className="mx-2">
              <span className="bg-green-600 rounded-full w-2 h-2 inline-block"></span>
              Running
            </Button>
          </div>
          { children }
        </main>
      </SidebarProvider>
      <Raycast/>
      <Toaster/>
    </>
  )
}
