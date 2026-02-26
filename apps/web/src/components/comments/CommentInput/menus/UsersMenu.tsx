import React, { memo, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Loader } from '../../../loader/Loader';
import { Reference } from '../../../../types/referenceTypes';
import { useReferenceData } from '../../../../api/hooks/useReferences';
import { UserListItem } from '../components/UsersListItem';
import styles from './UsersMenu.module.scss';

interface FormatMenuProps {
  position: { top?: number; left?: number; bott?: number };
  text: string | null;
  onSelect: ({ id, name }: Reference) => void;
}

export const UsersMenu: React.FC<FormatMenuProps> = memo(({ position, text, onSelect }) => {
  const { data, isLoading } = useReferenceData(['users']);
  const [choosed, setChoosed] = useState<number>(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const filteredUsers = useMemo(() => {
    const users = data?.users || [];
    
    if (!text) return users;
    
    return users.filter(user => user.name.toLowerCase().includes(text.toLowerCase()));
  }, [data, text]);

  useEffect(() => {
    setChoosed(0);
  }, [text, data]);

  const handleMouseEnter = useCallback((index: number) => {
    setChoosed(index);
  }, []);

  const setItemRef = useCallback((index: number, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  const scrollToItem = useCallback((index: number) => {
    const itemElement = itemRefs.current.get(index);
    if (itemElement) {
      itemElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.stopPropagation();

    if (!filteredUsers || filteredUsers.length === 0) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(filteredUsers[choosed]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setChoosed(prev => {
        const newIndex = prev === 0 ? filteredUsers.length - 1 : prev - 1;
        scrollToItem(newIndex);
        return newIndex;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setChoosed(prev => {
        const newIndex = prev === filteredUsers.length - 1 ? 0 : prev + 1;
        scrollToItem(newIndex);
        return newIndex;
      });
    }
  }, [filteredUsers, choosed, onSelect, scrollToItem]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={styles.usersMenu}
      style={{
        left: position.left,
        bottom: position.bott,
      }}
    >
      <div ref={listRef} className={styles.usersList}>
        {isLoading && <Loader />}
        {(!filteredUsers || filteredUsers.length === 0) && !isLoading && (
          <div className={styles.emptyState}>Пользователи не найдены</div>
        )}
        {filteredUsers?.map((user: Reference, index: number) => (
          <UserListItem
            key={user.id}
            user={user}
            index={index}
            isSelected={index === choosed}
            onSelect={onSelect}
            onMouseEnter={handleMouseEnter}
            setItemRef={setItemRef}
          />
        ))}
      </div>
    </div>
  );
});
