import { useCallback, useRef } from 'react';

import { Reference } from '../../../types/referenceTypes';

interface UseMentionsProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  updateInputState: (html: string) => void;
  closeUsersMenu: () => void;
}

interface MentionHandlers {
  handleMentionKeyDown: (e: Event) => void;
  handleMentionPaste: (e: Event) => void;
  handleMentionInput: (e: Event) => void;
}

export const useMentions = ({ editorRef, updateInputState, closeUsersMenu }: UseMentionsProps) => {
  const handlersRef = useRef<MentionHandlers | null>(null);

  if (!handlersRef.current) {
    handlersRef.current = {
      handleMentionKeyDown: (e: Event) => {
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.key === 'Backspace' || keyboardEvent.key === 'Delete') {
          e.preventDefault();
          const span = e.target as HTMLElement;

          const handlers = handlersRef.current!;
          span.removeEventListener('keydown', handlers.handleMentionKeyDown);
          span.removeEventListener('paste', handlers.handleMentionPaste);
          span.removeEventListener('input', handlers.handleMentionInput);

          span.remove();

          if (editorRef?.current) {
            updateInputState(editorRef.current.innerHTML);
          }
        }
      },

      handleMentionPaste: (e: Event) => {
        e.preventDefault();
      },

      handleMentionInput: (e: Event) => {
        e.preventDefault();
      },
    };
  }

  const setCaretAfterMention = useCallback((element: HTMLElement) => {
    const range = document.createRange();
    const selection = window.getSelection();

    if (!selection) return;

    const mentions = element.querySelectorAll('.user-mention');
    const lastMention = mentions[mentions.length - 1];

    if (lastMention && lastMention.nextSibling) {
      range.setStartAfter(lastMention);
      range.setEndAfter(lastMention);
    } else {
      range.selectNodeContents(element);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
  }, []);

  const getMentionMenuPosition = useCallback(() => {
    if (!editorRef.current) return { top: 0, left: 0 };

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { top: 0, left: 0 };

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    const left = rect.left - editorRect.left - 5;
    const bott = rect.top - editorRect.bottom + 70;

    return { left, bott };
  }, []);

  const addUserInEditor = useCallback(
    (user: Reference) => {
      if (!editorRef?.current) return;

      const currentText = editorRef.current.innerText || '';
      const lastAtPosition = currentText.lastIndexOf('@');

      if (lastAtPosition === -1) return;

      const formattedName = `<span
        contenteditable="false"
        data-user-id="${user.id}"
        class="user-mention"
      >@${user.name}</span>`;

      const textBeforeAt = currentText.slice(0, lastAtPosition);
      const newHTML = textBeforeAt + formattedName;

      editorRef.current.innerHTML = newHTML;
      updateInputState(editorRef.current.innerText);
      closeUsersMenu();

      const mentionSpan = editorRef.current.querySelector('.user-mention:last-child') as HTMLElement;
      if (mentionSpan && handlersRef.current) {
        const { handleMentionKeyDown, handleMentionPaste, handleMentionInput } = handlersRef.current;

        mentionSpan.addEventListener('keydown', handleMentionKeyDown);
        mentionSpan.addEventListener('paste', handleMentionPaste);
        mentionSpan.addEventListener('input', handleMentionInput);
      }

      setCaretAfterMention(editorRef.current);
    },
    [editorRef, updateInputState, setCaretAfterMention, closeUsersMenu],
  );

  return {
    addUserInEditor,
    getMentionMenuPosition,
  };
};
