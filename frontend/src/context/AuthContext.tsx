import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

interface AuthState {
  token: string | null;
  userId: string | null;
  userEmail: string | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: { id: string; email: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token: localStorage.getItem("token"),
    userId: localStorage.getItem("userId"),
    userEmail: localStorage.getItem("userEmail"),
  }));

  const login = useCallback(
    (token: string, user: { id: string; email: string }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userEmail", user.email);
      setState({ token, userId: user.id, userEmail: user.email });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    setState({ token: null, userId: null, userEmail: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, isAuthenticated: !!state.token }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
