import { DeleteOutlined, EditOutlined, InboxOutlined, MoreOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Dropdown, Tag, Tooltip, type MenuProps } from 'antd';

import type { SwItemDetail, SwItemListRow } from '@/types/swRegistry';

import styles from '../SwStructurePage.module.scss';

type Props = {
  item: SwItemListRow;
  detail?: SwItemDetail;
  /** Подписи, собранные панелью: вид разработки и короткое имя контрагента. */
  labels: { developmentKind: string; partner: string };
  folderPath?: string | null;
  svnEnabled: boolean;
  isArchived: boolean;
  fullNameDiffers: boolean;
  canManageItem: boolean;
  canEditItem: boolean;
  itemActionPending: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onMarkDeleted: () => void;
  onPickFolder: () => void;
  onSelectElement: (elementId: string) => void;
};

/** Шапка программы: обозначение, наименование, реквизиты и редкие действия в «⋯». */
export function SwProgramHeader({
  item,
  detail,
  labels,
  folderPath,
  svnEnabled,
  isArchived,
  fullNameDiffers,
  canManageItem,
  canEditItem,
  itemActionPending,
  onEdit,
  onArchive,
  onRestore,
  onMarkDeleted,
  onPickFolder,
  onSelectElement,
}: Props) {
  const itemMenuItems: NonNullable<MenuProps['items']> = [
    isArchived
      ? { key: 'restore', icon: <UndoOutlined />, label: 'Вернуть из архива' }
      : { key: 'archive', icon: <InboxOutlined />, label: 'В архив' },
    { type: 'divider' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить', danger: true },
  ];
  const handleItemMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'archive') onArchive();
    else if (key === 'restore') onRestore();
    else if (key === 'delete') onMarkDeleted();
  };

  return (
    <header className={styles.programHeadCard}>
      <div className={styles.programHeadRow}>
        <div className={styles.programHeadTitle}>
          <div className={styles.programEyebrow}>
            <span className={styles.programDesignation}>{item.designation}</span>
            <span aria-hidden>·</span>
            <span>{labels.developmentKind}</span>
            {isArchived ? (
              <Tag bordered={false} className={styles.programState}>
                архивная
              </Tag>
            ) : null}
          </div>
          <h2 className={styles.programHeadName}>{item.shortName}</h2>
          {fullNameDiffers ? <div className={styles.programFullName}>{item.fullName}</div> : null}
        </div>
        {canManageItem ? (
          <div className={styles.programHeadActions}>
            {/* Архивная программа только для чтения: правка возвращается вместе с программой из архива. */}
            {canEditItem ? (
              <Button size='small' icon={<EditOutlined />} disabled={!detail} onClick={onEdit}>
                Редактировать
              </Button>
            ) : null}
            <Dropdown
              trigger={['click']}
              placement='bottomRight'
              menu={{ items: itemMenuItems, onClick: handleItemMenu }}
            >
              <Button
                size='small'
                icon={<MoreOutlined />}
                loading={itemActionPending}
                aria-label='Другие действия с программой'
              />
            </Dropdown>
          </div>
        ) : null}
      </div>

      <dl className={styles.programMeta}>
        <div className={styles.metaCell}>
          <dt>Элемент структуры</dt>
          <dd title={`${item.element.code} — ${item.element.name}`}>
            <button type='button' className={styles.metaLink} onClick={() => onSelectElement(item.element.id)}>
              {item.element.name}
            </button>
          </dd>
        </div>
        <div className={styles.metaCell}>
          <dt>Ответственный</dt>
          <dd>
            <span className={styles.metaText}>{item.responsible.name}</span>
          </dd>
        </div>
        <div className={styles.metaCellWide}>
          <dt>Разработчик</dt>
          <dd title={labels.partner}>
            <span className={styles.metaText}>{labels.partner}</span>
          </dd>
        </div>
        {item.specUrl ? (
          <div className={styles.metaCellWide}>
            <dt>Техническое задание</dt>
            <dd title={item.specUrl}>
              <a href={item.specUrl} target='_blank' rel='noreferrer' className={styles.metaLink}>
                {item.specUrl}
              </a>
            </dd>
          </div>
        ) : null}
        {svnEnabled ? (
          <div className={styles.metaCellWide}>
            <dt>Каталог в SVN</dt>
            <dd>
              {folderPath ? (
                <span className={styles.metaText} title={folderPath}>
                  {folderPath}
                </span>
              ) : (
                <span className={styles.metaEmpty}>не привязан</span>
              )}
              {canEditItem ? (
                folderPath ? (
                  <Tooltip title='Изменить каталог'>
                    <Button
                      type='text'
                      size='small'
                      className={styles.metaAction}
                      icon={<EditOutlined />}
                      aria-label='Изменить каталог в SVN'
                      onClick={onPickFolder}
                    />
                  </Tooltip>
                ) : (
                  <Button type='link' size='small' onClick={onPickFolder}>
                    Привязать
                  </Button>
                )
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
    </header>
  );
}
