// /packages/web/src/features/settings/hooks/useSettingsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // Cliente API
import { BusinessHours, BusinessException, ProfileSettings } from '@/packages/shared-types';

type SettingsData = {
  profile: ProfileSettings; // Assumindo que o endpoint retorne isso
  businessHours: BusinessHours[];
  businessExceptions: BusinessException[];
};

const fetchSettings = async (): Promise<SettingsData> => {
  // Esta rota de API /api/settings deverá ser criada no backend
  // para retornar todos os dados necessários de uma vez.
  const response = await api.get('/api/settings');
  return response.data;
};

export const useSettingsQuery = () => {
  return useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });
};