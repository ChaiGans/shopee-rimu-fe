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
import { Home, Info, FileText, LogOut, LogIn, UserPlus } from "lucide-react";

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

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="text-2xl font-bold px-4 py-2">Rimu</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Link to="/" className="w-full">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
          <Link to="/about" className="w-full">
            <Button
              variant={isActive("/about") ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <Info className="mr-2 h-4 w-4" /> About
            </Button>
          </Link>
          <Link to="/hpp" className="w-full">
            <Button
              variant={isActive("/hpp") ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" /> HPP
            </Button>
          </Link>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {authProps?.isAuthenticated ? (
          <Button
            onClick={handleLogout}
            variant={"ghost"}
            className="w-full justify-start text-red-600 bg-white"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        ) : (
          <>
            <Link to="/login" className="w-full">
              <Button className="w-full justify-start" variant="ghost">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Button>
            </Link>
            <Link to="/register" className="w-full">
              <Button className="w-full justify-start">
                <UserPlus className="mr-2 h-4 w-4" /> Register
              </Button>
            </Link>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
