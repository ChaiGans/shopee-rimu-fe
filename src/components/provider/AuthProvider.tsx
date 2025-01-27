import { useState, useEffect, ReactNode, createContext } from "react";
import { AuthContextType, Userinfo } from "@/types/AuthContextType";
import { getSelfInformation } from "@/services/selfService";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<Userinfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchSelfInfo() {
      try {
        const response = await getSelfInformation();
        if (isMounted) {
          setIsAuthenticated(true);
          setUser(response?.payload || null);
        }
      } catch (error) {
        if (isMounted) {
          setIsAuthenticated(false);
          console.error("Failed to fetch user information:", error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSelfInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, setIsAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};
