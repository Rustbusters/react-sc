import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChartLine, Logs, Play, Send, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const items = [
  { title: "Simulazione", url: "/simulation", icon: Play },
  { title: "Logs", url: "/logs", icon: Logs },
  { title: "Stats", url: "/stats", icon: ChartLine },
  { title: "Send", url: "/send", icon: Send },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="pb-0">
        <NavLink to="/">
          <img
            src={ state === "collapsed" ? "/logo_square.svg" : "/logo.svg" }
            alt="Logo"
            className="h-10 w-auto transition-all duration-300"
          />
        </NavLink>
      </SidebarHeader>
      <SidebarContent className="pt-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              { items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={ item.title }>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={ item.url }
                        className={ isActive ? "font-bold" : "" }
                      >
                        <item.icon strokeWidth={ isActive ? 3 : 2 } style={ { transition: 'stroke-width 0.2s ease' } }/>
                        <span>{ item.title }</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }) }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="relative">
        <p
          className={ `text-center text-sm overflow-hidden transition-opacity duration-500 ease-in ${
            state === "expanded" ? "opacity-100 max-h-20" : "opacity-0 max-h-0 delay-0"
          }` }
        >
          Advanced Programming Course 2024-2025 UNITN
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
