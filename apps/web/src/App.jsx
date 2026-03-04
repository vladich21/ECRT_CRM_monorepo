import { useState, useEffect } from 'react';
import { App as AntdApp } from 'antd';
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

const MODAL_MAP = {
  positionForm: PositionFormModal,
  contactForm: PartnerContactFormModal,
  confirm: ConfirmModal,
  fileForm: FileUploadModal,
  withDescription: WithDescriptionFormModal,
  patentAreaForm: PatentAreasFormModal,
};

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

  const ActiveModal = MODAL_MAP[modalProps.type];

  return (
    <AntdApp>
      <AppRoutes />
      <AuthLoadingScreen visible={showLoadingScreen} />
      {ActiveModal && <ActiveModal {...modalProps} />}
    </AntdApp>
  );
}

export default App;
