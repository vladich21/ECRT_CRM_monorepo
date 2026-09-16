import { useEffect, useMemo, useState } from 'react';
import { FileWordOutlined, FolderOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { App, Alert, Button, Checkbox, Modal, Spin } from 'antd';

import { formatFileSize } from '@/utils/formatFileSize';
import styles from './SvnPickerModal.module.scss';
import { svnApi, type SvnEntry } from './svnApi';

type Props = {
  open: boolean;
  /**
   * Что делаем: file — прикрепить файл к существующему объекту, folder — назначить каталог программе,
   * select — только выбрать файл (документ ещё не создан, файл прикрепится при сохранении).
   */
  mode?: 'file' | 'folder' | 'select';
  objectType?: 'sw_item' | 'sw_document' | 'sw_sheet';
  objectId?: string;
  /** Программа, которой назначается каталог (в режиме folder). */
  itemId?: string;
  /** Начальный каталог: например, папка программы в SVN. */
  startPath?: string;
  /**
   * Обновление уже прикреплённой копии: открываем каталог этого файла и
   * показываем только его — остальное содержимое по флажку, если нужен другой файл.
   */
  currentPath?: string | null;
  onClose: () => void;
  onDone?: () => void;
  /** Режим select: выбранный файл. */
  onSelect?: (entry: SvnEntry) => void;
};

function Crumbs({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const parts = path ? path.split('/') : [];
  return (
    <div className={styles.crumbs}>
      <button type='button' className={styles.crumb} onClick={() => onNavigate('')}>
        Репозиторий
      </button>
      {parts.map((part, index) => {
        const target = parts.slice(0, index + 1).join('/');
        const last = index === parts.length - 1;
        return (
          <span key={target}>
            <span className={styles.sep}> / </span>
            {last ? (
              <span className={styles.crumbCurrent}>{part}</span>
            ) : (
              <button type='button' className={styles.crumb} onClick={() => onNavigate(target)}>
                {part}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function SvnPickerModal({
  open,
  mode = 'file',
  objectType,
  objectId,
  itemId,
  startPath = '',
  currentPath,
  onClose,
  onDone,
  onSelect,
}: Props) {
  const folderMode = mode === 'folder';
  const selectMode = mode === 'select';
  const { message } = App.useApp();
  const currentDir = currentPath ? currentPath.split('/').slice(0, -1).join('/') : null;
  const currentName = currentPath ? (currentPath.split('/').pop() ?? null) : null;
  const [path, setPath] = useState(currentDir ?? startPath);
  const [selected, setSelected] = useState<SvnEntry | null>(null);
  /** Пока не сняли — в каталоге текущего файла виден только он сам. */
  const [onlyCurrent, setOnlyCurrent] = useState(Boolean(currentPath));

  // Открываем окно на каталоге обновляемого файла, а не там, где были в прошлый раз.
  useEffect(() => {
    if (!open) return;
    setPath(currentDir ?? startPath);
    setOnlyCurrent(Boolean(currentPath));
    setSelected(null);
  }, [open, currentDir, currentPath, startPath]);

  const listQuery = useQuery({
    queryKey: ['svn', 'browse', path],
    queryFn: () => svnApi.browse(path),
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  const attachMut = useMutation({
    mutationFn: () =>
      folderMode
        ? svnApi.link({ itemId: itemId!, path })
        : svnApi.attach({ objectType: objectType!, objectId: objectId!, path: selected!.path }),
    onSuccess: (result: { filename?: string; revision?: number; svnPath?: string }) => {
      message.success(
        folderMode
          ? `Программа связана с каталогом «${result.svnPath || 'корень'}»`
          : `Файл «${result.filename}» прикреплён из SVN (ревизия ${result.revision})`,
      );
      onDone?.();
      onClose();
    },
    onError: (err: unknown) => {
      const text =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Не удалось прикрепить файл';
      message.error(text);
    },
  });

  const confirm = () => {
    if (selectMode) {
      if (!selected) return;
      onSelect?.(selected);
      onClose();
      return;
    }
    attachMut.mutate();
  };

  const allEntries = listQuery.data ?? [];
  // Фильтр действует только в каталоге самого файла: уйдя в другой, показываем всё.
  const inCurrentDir = currentDir !== null && path === currentDir;
  const entries =
    onlyCurrent && inCurrentDir && currentName
      ? allEntries.filter(e => e.kind === 'file' && e.name === currentName)
      : allEntries;
  const hiddenCount = allEntries.length - entries.length;
  const errorText = useMemo(() => {
    const err = listQuery.error as { response?: { data?: { message?: string } } } | null;
    return err?.response?.data?.message ?? (listQuery.isError ? 'Не удалось прочитать каталог SVN' : null);
  }, [listQuery.error, listQuery.isError]);

  const openEntry = (entry: SvnEntry) => {
    if (entry.kind === 'dir') {
      setPath(entry.path);
      setSelected(null);
    } else {
      setSelected(entry);
    }
  };

  const confirmLabel = folderMode ? 'Выбрать этот каталог' : selectMode ? 'Выбрать' : 'Прикрепить';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        folderMode
          ? 'Выбор каталога программы в SVN'
          : currentPath
            ? 'Обновление файла из SVN'
            : 'Выбор файла в SVN конструкторов'
      }
      width={860}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={styles.footerPath} title={folderMode ? path : selected?.path}>
            {folderMode ? path || 'Корень репозитория' : (selected?.path ?? 'Файл не выбран')}
          </span>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type='primary'
            disabled={folderMode ? false : !selected}
            loading={attachMut.isPending}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <Crumbs
        path={path}
        onNavigate={next => {
          setPath(next);
          setSelected(null);
        }}
      />

      {currentPath && inCurrentDir ? (
        <Checkbox
          className={styles.onlyCurrent}
          checked={!onlyCurrent}
          onChange={e => {
            setOnlyCurrent(!e.target.checked);
            setSelected(null);
          }}
        >
          Показать остальное содержимое каталога
          {onlyCurrent && hiddenCount > 0 ? ` (скрыто ${hiddenCount})` : ''}
        </Checkbox>
      ) : null}

      {errorText ? (
        <Alert
          type='error'
          showIcon
          message={errorText}
          action={
            <Button size='small' icon={<ReloadOutlined />} onClick={() => void listQuery.refetch()}>
              Повторить
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {listQuery.isLoading ? (
            <div className={styles.state}>
              <Spin />
            </div>
          ) : entries.length === 0 ? (
            <div className={styles.state}>Каталог пуст</div>
          ) : (
            entries.map(entry => (
              <button
                key={entry.path}
                type='button'
                className={`${styles.row}${selected?.path === entry.path ? ` ${styles.rowSelected}` : ''}`}
                onClick={() => openEntry(entry)}
                onDoubleClick={() => {
                  if (folderMode || entry.kind !== 'file') return;
                  if (selectMode) {
                    onSelect?.(entry);
                    onClose();
                    return;
                  }
                  attachMut.mutate();
                }}
              >
                {entry.kind === 'dir' ? (
                  <FolderOutlined className={styles.icon} />
                ) : (
                  <FileWordOutlined className={`${styles.icon} ${styles.iconFile}`} />
                )}
                <span className={styles.name} title={entry.name}>
                  {entry.name}
                </span>
                {entry.size != null ? <span className={styles.meta}>{formatFileSize(entry.size)}</span> : null}
                {entry.revision != null ? <span className={styles.meta}>r{entry.revision}</span> : null}
              </button>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
