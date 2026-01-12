"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "./types";
import { getToken, getUser, setToken, setUser, clearToken, clearUser } from "./auth";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();
    const token = getToken();
    if (token && storedUser) {
      setUserState(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, userData: User) => {
    setToken(token);
    setUser(userData);
    setUserState(userData);
  }, []);

  const logout = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Auth] Logging out, clearing token and user");
    }
    clearToken();
    clearUser();
    setUserState(null);
    if (process.env.NODE_ENV === "development") {
      // Verify cleanup
      const remainingToken = typeof window !== "undefined" ? localStorage.getItem("jemo_token") : null;
      const remainingUser = typeof window !== "undefined" ? localStorage.getItem("jemo_user") : null;
      console.log("[Auth] After logout - token:", remainingToken, "user:", remainingUser);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.get<User>("/auth/me", true);
      setUser(userData);
      setUserState(userData);
    } catch {
      // If refresh fails, keep existing user data
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

