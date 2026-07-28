import type { ModalFuncProps } from 'antd/es/modal/interface';

export type GanttConfirmFn = (props: ModalFuncProps) => { destroy: () => void } | void;

/** Выше Editor / порталов SVAR, иначе кнопки модалки «мёртвые». */
export const GANTT_CONFIRM_Z_INDEX = 11000;

/**
 * Ant Design confirm поверх Gantt.
 * delay: дать SVAR отпустить pointer/drag до открытия модалки.
 */
export function runGanttConfirm(
  confirm: GanttConfirmFn,
  props: ModalFuncProps,
  delayMs = 100,
): void {
  window.setTimeout(() => {
    confirm({
      centered: true,
      zIndex: GANTT_CONFIRM_Z_INDEX,
      getContainer: () => document.body,
      maskClosable: true,
      keyboard: true,
      ...props,
    });
  }, delayMs);
}

/** Info-модалка: «Понятно» / «Отмена» / Escape / маска — один finish(). */
export function openGanttInfoModal(
  confirm: GanttConfirmFn,
  title: string,
  content: string,
  onClose?: () => void,
): void {
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    onClose?.();
  };

  runGanttConfirm(confirm, {
    title,
    content,
    okText: 'Понятно',
    cancelText: 'Отмена',
    onOk: finish,
    onCancel: finish,
    afterClose: finish,
  });
}
