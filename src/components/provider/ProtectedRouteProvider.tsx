// src/components/ProtectedRouteProvider.tsx
import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

const ProtectedRouteProvider = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useContext(AuthContext)!;
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated === false) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || isAuthenticated === null) return <div>Loading...</div>;

  return children;
};

export default ProtectedRouteProvider;
