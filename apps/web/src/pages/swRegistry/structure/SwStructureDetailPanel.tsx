import { Fragment, useMemo } from 'react';
import { DeleteOutlined, EditOutlined, InboxOutlined, MoreOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import { App, Button, Dropdown, Spin, Tag, type MenuProps } from 'antd';
import { Link } from 'react-router-dom';

import { useSwItems, useSwStructurePatentLinks } from '@/api/swRegistry/swRegistryApiHooks';
import type { SwItemListRow, SwStructureNode } from '@/types/swRegistry';
import { groupProgramsByResponsible } from './swStructurePrograms';
import { getInitials } from './swStructureTree';
import styles from './SwStructureDetailPanel.module.scss';

export type SwStructureDetailActions = {
  onEdit: (node: SwStructureNode) => void;
  onAssign: (node: SwStructureNode) => void;
  onArchive: (node: SwStructureNode) => void;
  onRestore: (node: SwStructureNode) => void;
  onMarkDeleted: (node: SwStructureNode) => void;
  onRemoveResponsible: (node: SwStructureNode, userId: string, roleCode: string) => void;
  onSelectParent: (node: SwStructureNode) => void;
};

type Props = {
  node: SwStructureNode;
  parent: SwStructureNode | null;
  typeByCode: Map<string, string>;
  roleByCode: Map<string, string>;
  canEdit: boolean;
  actions: SwStructureDetailActions;
  archiveLoading?: boolean;
  restoreLoading?: boolean;
  markDeletedLoading?: boolean;
  /** Выбор программы в дереве (из списка ответственных). */
  onSelectProgram: (item: SwItemListRow) => void;
};

function patentLabel(reg: string | null | undefined, name: string | null | undefined) {
  const regPart = reg?.trim();
  const namePart = name?.trim();
  if (regPart && namePart) return `${regPart} · ${namePart}`;
  return regPart || namePart || '—';
}

/**
 * Панель элемента структуры (система, подсистема, компонент). Программы ветки видны в дереве слева, здесь
 * их не повторяем; ответственные собираются с программ самого элемента, дополнительные назначаются на элемент.
 */
export function SwStructureDetailPanel({
  node,
  parent,
  typeByCode,
  roleByCode,
  canEdit,
  actions,
  archiveLoading,
  restoreLoading,
  markDeletedLoading,
  onSelectProgram,
}: Props) {
  const { modal } = App.useApp();
  const isArchived = node.recordState === 'archived';
  const canChange = canEdit && !isArchived;
  const typeLabel = typeByCode.get(node.elementTypeCode) ?? node.elementTypeCode;

  // API отдаёт программы всей ветки — оставляем привязанные к самому элементу. У архивного элемента программы
  // ушли в архив вместе с ним, поэтому и спрашиваем архивные.
  const itemsQuery = useSwItems({
    elementId: node.id,
    recordState: isArchived ? 'archived' : 'active',
    limit: 200,
  });
  const ownPrograms = useMemo(
    () => (itemsQuery.data?.items ?? []).filter(item => item.element.id === node.id),
    [itemsQuery.data, node.id],
  );
  const programResponsibles = useMemo(() => groupProgramsByResponsible(ownPrograms), [ownPrograms]);

  const patentLinksQuery = useSwStructurePatentLinks(node.id);
  const patentLinks = patentLinksQuery.data ?? [];

  const confirmArchive = () =>
    modal.confirm({
      title: 'Перевести ветку в архив?',
      content: 'Вложенные элементы и программы уйдут в архив каскадом.',
      okText: 'В архив',
      okButtonProps: { danger: true },
      onOk: () => actions.onArchive(node),
    });

  const confirmMarkDeleted = () =>
    modal.confirm({
      title: 'Удалить ветку?',
      content: 'Элементы, программы и документы исчезнут из реестра и свода. Действие необратимо.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      onOk: () => actions.onMarkDeleted(node),
    });

  // На виду только правка; архив и удаление — в меню «⋯», как у программы.
  const menuItems: NonNullable<MenuProps['items']> = [
    isArchived
      ? { key: 'restore', icon: <UndoOutlined />, label: 'Вернуть из архива' }
      : { key: 'archive', icon: <InboxOutlined />, label: 'В архив' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить', danger: true },
  ];
  const handleMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'archive') confirmArchive();
    else if (key === 'restore') actions.onRestore(node);
    else if (key === 'delete') confirmMarkDeleted();
  };

  const description = node.description?.trim();

  return (
    <div className={styles.detailStack}>
      <header className={styles.programHeadCard}>
        <div className={styles.programHeadRow}>
          <div className={styles.programHeadTitle}>
            <div className={styles.programEyebrow}>
              <span className={styles.programDesignation}>{node.code}</span>
              <span aria-hidden>·</span>
              <span>{typeLabel}</span>
              {isArchived ? (
                <Tag bordered={false} className={styles.programState}>
                  {node.archivedByCascade ? 'в архиве вместе с вышестоящим' : 'архивный'}
                </Tag>
              ) : null}
            </div>
            <h2 className={styles.programHeadName}>{node.name}</h2>
          </div>
          {canEdit ? (
            <div className={styles.programHeadActions}>
              {canChange ? (
                <Button size='small' icon={<EditOutlined />} onClick={() => actions.onEdit(node)}>
                  Изменить
                </Button>
              ) : null}
              <Dropdown trigger={['click']} placement='bottomRight' menu={{ items: menuItems, onClick: handleMenu }}>
                <Button
                  size='small'
                  icon={<MoreOutlined />}
                  loading={archiveLoading || restoreLoading || markDeletedLoading}
                  aria-label='Другие действия с элементом'
                />
              </Dropdown>
            </div>
          ) : null}
        </div>

        <dl className={styles.programMeta}>
          <div className={styles.metaCellWide}>
            <dt>Вышестоящий элемент</dt>
            <dd>
              {parent ? (
                <button
                  type='button'
                  className={styles.metaLink}
                  title={`${parent.code} — ${parent.name}`}
                  onClick={() => actions.onSelectParent(parent)}
                >
                  {parent.code} · {parent.name}
                </button>
              ) : (
                <span className={styles.metaEmpty}>корневой элемент</span>
              )}
            </dd>
          </div>
          {description ? (
            <div className={styles.metaCellFull}>
              <dt>Описание</dt>
              <dd>
                <span className={styles.metaMultiline}>{description}</span>
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Ответственные</h3>

        <div className={styles.respSection}>
          <div className={styles.respSectionHead}>
            <span className={styles.respSectionTitle}>По программам элемента</span>
          </div>
          {itemsQuery.isLoading ? (
            <Spin size='small' />
          ) : programResponsibles.length === 0 ? (
            <div className={styles.emptyHint}>К элементу не привязано программ</div>
          ) : (
            programResponsibles.map(person => (
              <div key={person.id} className={styles.responsibleRow}>
                <div className={styles.responsibleMain}>
                  <div className={styles.responsibleAvatar}>{getInitials(person.name)}</div>
                  <div className={styles.responsibleText}>
                    <div className={styles.responsibleName}>{person.name}</div>
                    <div className={styles.responsiblePrograms}>
                      {person.programs.map((item, index) => (
                        <Fragment key={item.id}>
                          {index > 0 ? ', ' : null}
                          <button
                            type='button'
                            className={styles.responsibleProgram}
                            title={`${item.designation} — ${item.fullName}`}
                            onClick={() => onSelectProgram(item)}
                          >
                            {item.shortName}
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.respSection}>
          <div className={styles.respSectionHead}>
            <span className={styles.respSectionTitle}>Дополнительные</span>
            {canChange ? (
              <Button type='link' size='small' icon={<PlusOutlined />} onClick={() => actions.onAssign(node)}>
                Добавить
              </Button>
            ) : null}
          </div>
          {node.responsibles.length === 0 ? (
            <div className={styles.emptyHint}>Не назначены</div>
          ) : (
            node.responsibles.map(r => (
              <div key={`${r.userId}-${r.roleCode}`} className={styles.responsibleRow}>
                <div className={styles.responsibleMain}>
                  <div className={styles.responsibleAvatar}>{getInitials(r.name)}</div>
                  <div className={styles.responsibleText}>
                    <div className={styles.responsibleName}>{r.name}</div>
                    <div className={styles.responsibleRole}>{roleByCode.get(r.roleCode) ?? r.roleCode}</div>
                  </div>
                </div>
                {canChange ? (
                  <button
                    type='button'
                    className={styles.removeLink}
                    onClick={() => actions.onRemoveResponsible(node, r.userId, r.roleCode)}
                  >
                    снять
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>
          Связи с РИД
          {patentLinks.length ? <span className={styles.cardTitleCount}>{patentLinks.length}</span> : null}
        </h3>
        {patentLinksQuery.isLoading ? (
          <Spin size='small' />
        ) : patentLinks.length === 0 ? (
          <div className={styles.emptyHint}>Нет связей с реестром РИД у программ этого элемента</div>
        ) : (
          <div className={styles.infoRows}>
            {patentLinks.map(link => (
              <div key={link.id} className={styles.infoRow}>
                <Link to={`/sw/structure?itemId=${link.software.id}`} className={styles.ridSoftwareLabel}>
                  {link.software.designation} · {link.software.shortName}
                </Link>
                <div className={styles.infoValue}>
                  <Link to={`/patents/${link.patentId}`} className={styles.infoLink}>
                    {patentLabel(link.patent.registrationNumber, link.patent.name)}
                  </Link>
                  {link.patent.isDeleted ? <span className={styles.ridDeletedHint}> · удалена</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
