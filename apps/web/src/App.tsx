import { AuthLoadingScreen } from '@/components/authLoadingScreen/AuthLoadingScreen';
import { GlobalModals } from '@/components/modals/GlobalModals';
import { useScrollDetailPagesToTop } from '@/hooks/registryScroll';
import { useAuthLoadingScreen } from '@/hooks/useAuthLoadingScreen';
import AppRoutes from '@/routers/AppRoutes';

function App() {
  useScrollDetailPagesToTop();
  const showLoadingScreen = useAuthLoadingScreen();

  return (
    <>
      <AppRoutes />
      <AuthLoadingScreen visible={showLoadingScreen} />
      <GlobalModals />
    </>
  );
}

export default App;
