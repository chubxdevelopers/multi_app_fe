import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  getSession as getSessionService,
  login as loginService,
  logout as logoutService,
} from "../../src/services/sessionService";

type User = any;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    company?: string,
    app?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const s = await getSessionService();
      setUser(s?.user ?? null);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(
    email: string,
    password: string,
    company?: string,
    app?: string
  ) {
    try {
      // pass company as the second parameter so the URL builder can build
      // a contextual endpoint like /api/{company}/{app}/auth/login when needed.
      await loginService({ email, password }, company, app);
      // after login, refresh session to get user and tokens
      const s = await getSessionService();
      setUser(s?.user ?? null);
    } catch (e: any) {
      Alert.alert("Login error", e.message || String(e));
      throw e;
    }
  }

  async function logout() {
    try {
      await logoutService();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
