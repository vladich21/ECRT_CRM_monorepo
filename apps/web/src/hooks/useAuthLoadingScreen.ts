import { useEffect, useState } from 'react';

import { authLoadingScreenStore } from '@/store/authLoadingScreenStore';

export function useAuthLoadingScreen(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    authLoadingScreenStore.registerSetState(setVisible);
    return () => {
      authLoadingScreenStore.unregisterSetState();
      authLoadingScreenStore.clearTimers();
    };
  }, []);

  return visible;
}
