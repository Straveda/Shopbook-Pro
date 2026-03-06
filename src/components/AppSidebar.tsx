import { LayoutDashboard, Users, CreditCard, Bell, ShoppingBag, Settings } from "lucide-react";
import { NavLink } from "./NavLink";
import { Briefcase } from "lucide-react";
import { Package } from "lucide-react";
import { Building } from "lucide-react";
import { BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Credit Book", url: "/credits", icon: CreditCard },
  { title: "Reminders", url: "/reminders", icon: Bell },
  { title: "Services", url: "/services", icon: Briefcase },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Vendors", url: "/vendors", icon: Building },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Sales", url: "/sales", icon: ShoppingBag },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-6 py-4">
          <h1 className={`font-bold text-xl text-sidebar-foreground ${collapsed ? "hidden" : ""}`}>
            ShopBook
          </h1>
          {collapsed && <span className="font-bold text-xl text-sidebar-foreground">SB</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      className="flex items-center gap-3"
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/settings"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    className="flex items-center gap-3"
                  >
                    <Settings className="h-5 w-5" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}