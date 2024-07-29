import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/navbar";

const Layout = () => {
  const location = useLocation();

  const hideLayout = location.pathname === "/login";

  return (
    <>
      {!hideLayout && <Navbar />}
      <Outlet />
    </>
  );
};

export default Layout;
