import type { ComponentType } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ApprovalDecisionModal } from '@/components/modals/currentModals/ApprovalDecisionModal';
import { ApprovalResubmitModal } from '@/components/modals/currentModals/ApprovalResubmitModal';
import { ApprovalStartModal } from '@/components/modals/currentModals/ApprovalStartModal';
import { ConfirmModal } from '@/components/modals/currentModals/ConfirmModal';
import { PartnerContactFormModal } from '@/components/modals/currentModals/ContactModal';
import { FileUploadModal } from '@/components/modals/currentModals/FileUploadModal';
import { PatentAreasFormModal } from '@/components/modals/currentModals/PatentAreasModal';
import { PositionFormModal } from '@/components/modals/currentModals/PositionModal';
import { WithDescriptionFormModal } from '@/components/modals/currentModals/WithDescriptionModal';
import { selectGlobalModalView, useModalStore, type ModalShellProps, type ModalType } from '@/store/ModalStore';

type RegistryModalComponent = ComponentType<ModalShellProps>;

const MODAL_MAP = {
  positionForm: PositionFormModal,
  contactForm: PartnerContactFormModal,
  confirm: ConfirmModal,
  fileForm: FileUploadModal,
  withDescription: WithDescriptionFormModal,
  patentAreaForm: PatentAreasFormModal,
  approvalStart: ApprovalStartModal,
  approvalDecision: ApprovalDecisionModal,
  approvalResubmit: ApprovalResubmitModal,
} satisfies Record<ModalType, RegistryModalComponent>;

/** Renders the active modal from `ModalStore` (see `docs/approvals/implementation-plan.md`). */
export function GlobalModals() {
  const modalProps = useModalStore(useShallow(selectGlobalModalView));

  if (!modalProps.open || !modalProps.type) return null;

  const ActiveModal = MODAL_MAP[modalProps.type];
  return <ActiveModal {...modalProps} />;
}
