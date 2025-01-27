export interface AuthContextType {
  isAuthenticated: boolean | null;
  user: Userinfo | null;
  loading: boolean;
  setIsAuthenticated: (a: boolean | null) => void;
}

export interface Userinfo {
  id: number;
  username: string;
  role: string;
}
