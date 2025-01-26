"use client";

import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 bg-orange-50">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-bold">
          Logo
        </Link>
      </div>
      <div className="hidden md:flex items-center space-x-4">
        <Button variant="ghost" asChild>
          <Link to="/login">Login</Link>
        </Button>
        <Button asChild>
          <Link to="/register">Register</Link>
        </Button>
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
