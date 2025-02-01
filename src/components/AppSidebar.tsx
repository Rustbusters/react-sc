import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ChartLine, Home, Inbox, Play, Search, Send, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Simulazione", url: "/simulation", icon: Play },
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Stats", url: "/stats", icon: ChartLine },
  { title: "Send", url: "/send", icon: Send },
  { title: "Search", url: "#", icon: Search },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Simulation Controller</SidebarGroupLabel>
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
