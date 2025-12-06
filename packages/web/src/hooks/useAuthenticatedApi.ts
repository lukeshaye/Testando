// packages/web/src/hooks/useAuthenticatedApi.ts
import { useSession } from "next-auth/react";
import { hc } from 'hono/client';
import { useMemo } from 'react';
import type app from '@/worker'; // Verifique se o alias aponta para a definição de tipos correta da API

export const useAuthenticatedApi = () => {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken; // Ou session?.user?.id se for usar ID temporariamente

  // useMemo garante que o cliente só seja recriado se o token mudar
  const client = useMemo(() => {
    return hc<typeof app>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787', {
      headers: token ? {
        Authorization: `Bearer ${token}`
      } : {}
    });
  }, [token]);

  return client;
};