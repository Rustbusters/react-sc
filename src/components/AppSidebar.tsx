import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChartLine, Logs, Play, Search, Send, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const items = [
  { title: "Simulazione", url: "/simulation", icon: Play },
  { title: "Logs", url: "/logs", icon: Logs },
  { title: "Stats", url: "/stats", icon: ChartLine },
  { title: "Send", url: "/send", icon: Send },
  { title: "Search", url: "#", icon: Search },
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
    </Sidebar>
  );
}
