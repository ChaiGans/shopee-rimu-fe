import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { logoutService } from "@/services/logoutService";
import { useToast } from "../ui/use-toast";
import {
  Home as HomeIcon,
  Info,
  LogOut,
  LogIn,
  UserPlus,
  Truck,
} from "lucide-react";

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

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Home", icon: HomeIcon, authOnly: false },
    { path: "/about", label: "About", icon: Info, authOnly: false },
    // { path: "/hpp", label: "HPP", icon: FileText, authOnly: true },
    // {
    //   path: "/nett-profit-generator",
    //   label: "NPG",
    //   icon: BotIcon,
    //   authOnly: true,
    // },
    {
      path: "/auto-shipping-config",
      label: "Auto Shipping Config",
      icon: Truck,
      authOnly: true,
    },
  ];

  const authLinks = [
    { path: "/login", label: "Login", icon: LogIn },
    { path: "/register", label: "Register", icon: UserPlus },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="text-2xl font-bold px-4 py-2">Rimu</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {navLinks
            .filter((link) => !link.authOnly || authProps?.isAuthenticated)
            .map(({ path, label, icon: Icon }) => (
            <Link to={path} key={path} className="w-full">
              <Button
                variant={isActive(path) ? "default" : "ghost"}
                className="w-full justify-start"
              >
                <Icon className="mr-2 h-4 w-4" /> {label}
              </Button>
            </Link>
            ))}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
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
