import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../utils/axiosConfig";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  company?: string;
  team?: string;
  role_id?: number;
  team_id?: number;
  company_id?: number;
  uiPermissions?: any[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  companySlug: string | null;
  appSlug: string | null;
  isInitialized: boolean;
  login: (
    token: string,
    userData: User,
    companySlug: string,
    appSlug: string
  ) => void;
  logout: () => void;
  getHomePath: () => string;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  companySlug: null,
  appSlug: null,
  isInitialized: false,
  login: () => {},
  logout: () => {},
  getHomePath: () => "/login",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [appSlug, setAppSlug] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const company = localStorage.getItem("companySlug");
    const app = localStorage.getItem("appSlug");

    const initializeAuth = async () => {
      if (token) {
        try {
          // Backend exposes verify at /api/:company/:app/verify
          const response = await api.get("/verify");
          if (response.data && response.data.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
            if (company) setCompanySlug(company);
            if (app) setAppSlug(app);
          }
        } catch (error) {
          console.log("Token verification failed, clearing auth data");
          localStorage.removeItem("token");
          localStorage.removeItem("companySlug");
          localStorage.removeItem("appSlug");
          setIsAuthenticated(false);
          setUser(null);
          setCompanySlug(null);
          setAppSlug(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setCompanySlug(null);
        setAppSlug(null);
      }
      setIsInitialized(true);
    };
    initializeAuth();
  }, []);

  const login = (
    token: string,
    userData: User,
    company: string,
    app: string
  ) => {
    localStorage.setItem("token", token);
    localStorage.setItem("companySlug", company);
    localStorage.setItem("appSlug", app);
    setUser(userData);
    setCompanySlug(company);
    setAppSlug(app);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("companySlug");
    localStorage.removeItem("appSlug");
    setIsAuthenticated(false);
    setUser(null);
    setCompanySlug(null);
    setAppSlug(null);
    // Call backend logout endpoint to clear the HTTP-only cookie
    api.post("/auth/logout").catch(() => {
      // Silently fail; cookie may already be cleared
    });
  };

  const getHomePath = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "admin":
        return user.company ? `/${user.company}/admin` : "/admin";
      case "user":
        return "/dashboard";
      case "manager":
        return "/manager/dashboard";
      default:
        return "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        getHomePath,
        companySlug,
        appSlug,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
