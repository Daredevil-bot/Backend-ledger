"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, User } from "@/app/lib/api";

type AuthState = {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount — ask the backend who is logged in via the JWT cookie
  // No localStorage involved — cookie is the single source of truth
  useEffect(() => {
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))  // 401 = not logged in, that's fine
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
