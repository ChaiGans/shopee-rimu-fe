import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { logoutService } from "@/services/logoutService";
import { useToast } from "../ui/use-toast";
import {
  Home as HomeIcon,
  Info,
  Package,
  Warehouse,
  LogOut,
  LogIn,
  UserPlus,
  Truck,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  authOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export function AppSidebar() {
  const authProps = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logoutService();
      authProps?.setIsAuthenticated(false);
      toast({
        title: "Logout Success",
        description: `Account has been logged out.`,
        variant: "success",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Logout Failed",
        description: "Failed to logout. Refresh page or contact support.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navGroups: NavGroup[] = [
    {
      label: "General",
      items: [
        { path: "/", label: "Home", icon: HomeIcon, authOnly: false },
        { path: "/about", label: "About", icon: Info, authOnly: false },
      ],
    },
    {
      label: "Logistics",
      items: [
        {
          path: "/logistics/auto-shipping-config",
          label: "Auto Shipping Config",
          icon: Truck,
          authOnly: true,
        },
      ],
    },
    {
      label: "Warehouse",
      items: [
        {
          path: "/warehouse/perhitungan-selisih",
          label: "Perhitungan Selisih",
          icon: Warehouse,
          authOnly: false,
        },
      ],
    },
    {
      label: "Utilities",
      items: [
        {
          path: "/utilities/hpp",
          label: "HPP",
          icon: Package,
          authOnly: true,
        },
        {
          path: "/utilities/nett-profit-generator",
          label: "Nett Profit Generator",
          icon: WashingMachine,
          authOnly: true,
        },
      ],
    },
  ];

  const authLinks = [
    { path: "/login", label: "Login", icon: LogIn },
    { path: "/register", label: "Register", icon: UserPlus },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="bg-white">
        <div className="text-2xl font-bold px-4 py-2">Rimu</div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.authOnly || authProps?.isAuthenticated,
          );

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map(({ path, label, icon: Icon }) => (
                    <SidebarMenuItem key={path}>
                      <SidebarMenuButton asChild isActive={isActive(path)}>
                        <Link to={path}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="bg-white">
        {authProps?.isAuthenticated ? (
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-600 bg-white"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        ) : (
          authLinks.map(({ path, label, icon: Icon }) => (
            <Link to={path} key={path} className="w-full">
              <Button className="w-full justify-start" variant="ghost">
                <Icon className="mr-2 h-4 w-4" /> {label}
              </Button>
            </Link>
          ))
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
