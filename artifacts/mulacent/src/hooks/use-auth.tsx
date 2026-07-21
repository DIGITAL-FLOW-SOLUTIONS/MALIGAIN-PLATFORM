import React, { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetCurrentUser,
  useLogin,
  useRegister,
  useLogout,
  type User,
  type LoginRequest,
  type RegisterRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest, onSuccess?: () => void, onError?: (err: any) => void) => void;
  register: (data: RegisterRequest, onSuccess?: () => void, onError?: (err: any) => void) => void;
  logout: () => void;
  isLoggingIn: boolean;
  isRegistering: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const login = (data: LoginRequest, onSuccess?: () => void, onError?: (err: any) => void) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          queryClient.setQueryData(getGetCurrentUserQueryKey(), res.user);
          onSuccess?.();
        },
        onError,
      }
    );
  };

  const register = (data: RegisterRequest, onSuccess?: () => void, onError?: (err: any) => void) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          queryClient.setQueryData(getGetCurrentUserQueryKey(), res.user);
          onSuccess?.();
        },
        onError,
      }
    );
  };

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
        setLocation("/login");
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: isError ? null : user || null,
        isLoading,
        login,
        register,
        logout,
        isLoggingIn: loginMutation.isPending,
        isRegistering: registerMutation.isPending,
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
