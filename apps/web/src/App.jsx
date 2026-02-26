import { useState, useEffect } from 'react';
import { ConfirmModal } from './components/modals/currentModals/ConfirmModal';
import { PartnerContactFormModal } from './components/modals/currentModals/ContactModal';
import { FileUploadModal } from './components/modals/currentModals/FileUploadModal';
import { PatentAreasFormModal } from './components/modals/currentModals/PatentAreasModal';
import { PositionFormModal } from './components/modals/currentModals/PositionModal';
import { WithDescriptionFormModal } from './components/modals/currentModals/WithDescriptionModal';
import { AuthLoadingScreen } from './components/authLoadingScreen/AuthLoadingScreen';
import AppRoutes from './routers/AppRoutes';
import { useModalStore } from './store/ModalStore';
import { authLoadingScreenStore } from './store/authLoadingScreenStore';

function App() {
  const modalProps = useModalStore();
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  useEffect(() => {
    authLoadingScreenStore.registerSetState(setShowLoadingScreen);
    
    return () => {
      authLoadingScreenStore.unregisterSetState();
      authLoadingScreenStore.clearTimers();
    };
  }, []);

  return (
    <>
      <AppRoutes />
      <AuthLoadingScreen visible={showLoadingScreen} />
      {modalProps.type === 'positionForm' ? (
        <PositionFormModal {...modalProps} />
      ) : modalProps.type === 'contactForm' ? (
        <PartnerContactFormModal {...modalProps} />
      ) : modalProps.type === 'confirm' ? (
        <ConfirmModal {...modalProps} />
      ) : modalProps.type === 'fileForm' ? (
        <FileUploadModal {...modalProps} />
      ) : modalProps.type === 'withDescription' ? (
        <WithDescriptionFormModal {...modalProps} />
      ) : modalProps.type === 'patentAreaForm' ? (
        <PatentAreasFormModal {...modalProps} />
      ) : null}
    </>
  );
}

export default App;
