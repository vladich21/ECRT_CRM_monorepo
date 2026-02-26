import { useCallback, useRef } from 'react';

interface UseFormatTextProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  setContent: (content: string) => void;
  maxHeight: number;
  minHeight: number;
}

interface SelectionResult {
  show: boolean;
  position: { top: number; left: number };
}

export const useFormatText = ({ editorRef, setContent, maxHeight, minHeight }: UseFormatTextProps) => {
  const selectionTimeoutRef = useRef<NodeJS.Timeout>(null);

  const formatText = useCallback(
    (command: 'bold' | 'italic' | 'underline' | 'insertOrderedList' | 'insertUnorderedList') => {
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand(command, false);
        setContent(editorRef.current.innerHTML);
      }
    },
    [editorRef, setContent],
  );

  const getFocusRect = useCallback((selection: Selection, rects: DOMRectList): DOMRect => {
    const focusRange = document.createRange();
    focusRange.setStart(selection.focusNode!, selection.focusOffset);
    focusRange.collapse(true);

    const focusRect = focusRange.getBoundingClientRect();

    if (focusRect.width === 0 && focusRect.height === 0) {
      return rects[rects.length - 1];
    }

    return focusRect;
  }, []);

  const checkSelection = useCallback((): SelectionResult => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const isSelectionInEditor =
        editorRef.current?.contains(selection.anchorNode) && editorRef.current?.contains(selection.focusNode);

      if (isSelectionInEditor) {
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();

        if (rects.length === 0) {
          return { show: false, position: { top: 0, left: 0 } };
        }

        const focusRect = getFocusRect(selection, rects);
        const menuWidth = 156;
        const menuHeight = 40;

        return {
          show: true,
          position: {
            top: focusRect.top - menuHeight - 8,
            left: focusRect.left + focusRect.width / 2 - menuWidth / 2,
          },
        };
      }
    }
    return { show: false, position: { top: 0, left: 0 } };
  }, [editorRef, getFocusRect]);

  const handleMouseUp = useCallback(
    (checkSelectionCallback: (result: SelectionResult) => void) => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      selectionTimeoutRef.current = setTimeout(() => {
        const result = checkSelection();
        checkSelectionCallback(result);
      }, 10);
    },
    [checkSelection],
  );

  const handleGlobalMouseUp = useCallback(
    (
      e: MouseEvent,
      menuRef: React.RefObject<HTMLDivElement | null>,
      checkSelectionCallback: (result: SelectionResult) => void,
    ) => {
      // Проверяем, что клик был вне нашего меню форматирования
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }

      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      selectionTimeoutRef.current = setTimeout(() => {
        const result = checkSelection();
        checkSelectionCallback(result);
      }, 10);
    },
    [checkSelection],
  );

  const clearSelectionTimeout = useCallback(() => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
  }, []);

  return {
    formatText,
    checkSelection,
    handleMouseUp,
    handleGlobalMouseUp,
    clearSelectionTimeout,
  };
};
