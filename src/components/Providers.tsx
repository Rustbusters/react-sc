import { Toaster } from "react-hot-toast";
import { SingletonTabProvider } from "@/components/SingletonTabProvider";
import { Raycast } from "@/components/CommandPalette.tsx";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SingletonTabProvider />
      { children }
      <Raycast/>
      <Toaster/>
    </>
  )
}
