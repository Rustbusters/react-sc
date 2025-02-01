import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Calendar, Home, Inbox, Play, Search, Send, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Simulazione",
    url: "/simulation",
    icon: Play,
  },
  {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
  },
  {
    title: "Send",
    url: "/send",
    icon: Send,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Simulation Controller</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              { items.map((item) => (
                <SidebarMenuItem key={ item.title }>
                  <SidebarMenuButton asChild>
                    <NavLink to={ item.url } className={ ({ isActive }) => isActive ? "text-primary" : "" }>
                      <item.icon/>
                      <span>{ item.title }</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )) }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
