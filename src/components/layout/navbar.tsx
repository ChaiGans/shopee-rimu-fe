"use client";

import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "../hooks/useAuth";
import { logoutService } from "@/services/logoutService";
import { useToast } from "../ui/use-toast";

function Navbar() {
  const authProps = useAuth();

  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutService();

      toast({
        title: "Logout Success",
        description: `Account has been logged out.`,
        variant: "success",
      });

      authProps?.setIsAuthenticated(false);
    } catch (err) {
      console.error(err);

      toast({
        title: "Logout Failed",
        description: "Failed to logout. Refresh page or contact support.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-orange-50">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-bold">
          Logo
        </Link>
      </div>
      <div className="hidden md:flex items-center space-x-4">
        {authProps && authProps.isAuthenticated ? (
          <>
            <Button variant={"destructive"} onClick={handleLogout} asChild>
              <Link to="/login">Logout</Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>
          </>
        )}
      </div>
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="outline" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <div className="flex flex-col space-y-4 mt-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

export default Navbar;
