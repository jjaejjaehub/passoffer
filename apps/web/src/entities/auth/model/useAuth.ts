'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/authApi';
import { clearToken, getToken } from './token';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    enabled: !!getToken(),
    retry: false,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  function logout() {
    clearToken();
    queryClient.clear();
    router.push('/login');
  }

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
