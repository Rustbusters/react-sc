import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider.tsx";

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {/* Sole (Light Mode) */ }
          <Sun
            className={ `h-5 w-5 transition-opacity duration-300 ${
              theme === "dark" ? "opacity-0 scale-90" : "opacity-100 scale-100"
            }` }
          />
          {/* Luna (Dark Mode) */ }
          <Moon
            className={ `absolute h-5 w-5 transition-opacity duration-300 ${
              theme === "dark" ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }` }
          />
          {/* TODO: aggiungere l'icona del system */}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={ () => setTheme("light") }>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={ () => setTheme("dark") }>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={ () => setTheme("system") }>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
