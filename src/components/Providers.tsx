import { Toaster } from "react-hot-toast";
import { SingletonTabProvider } from "@/components/SingletonTabProvider";
import { CommandDialogDemo } from "@/components/CommandPalette.tsx";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SingletonTabProvider />
      { children }
      <CommandDialogDemo/>
      <Toaster/>
    </>
  )
}
