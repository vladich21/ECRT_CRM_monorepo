import { DeleteOutlined, EditOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import { App, Button, Spin, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';

import { useSwItems, useSwStructurePatentLinks } from '@/api/swRegistry/swRegistryApiHooks';
import type { SwStructureNode } from '@/types/swRegistry';
import { getInitials } from './swStructureTree';
import styles from './SwStructurePage.module.scss';

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
  kindByCode: Map<string, string>;
  canEdit: boolean;
  actions: SwStructureDetailActions;
  archiveLoading?: boolean;
  restoreLoading?: boolean;
  markDeletedLoading?: boolean;
};

function patentLabel(reg: string | null | undefined, name: string | null | undefined) {
  const regPart = reg?.trim();
  const namePart = name?.trim();
  if (regPart && namePart) return `${regPart} · ${namePart}`;
  return regPart || namePart || '—';
}

function elementTitle(code: string, name: string) {
  return `${code} · ${name}`;
}

export function SwStructureDetailPanel({
  node,
  parent,
  typeByCode,
  roleByCode,
  kindByCode,
  canEdit,
  actions,
  archiveLoading,
  restoreLoading,
  markDeletedLoading,
}: Props) {
  const { modal } = App.useApp();
  const isArchived = node.recordState === 'archived';

  const itemsQuery = useSwItems({
    elementId: node.id,
    recordState: isArchived ? 'archived' : 'active',
    limit: 100,
  });
  const patentLinksQuery = useSwStructurePatentLinks(node.id);

  const elementItems = (itemsQuery.data?.items ?? []).filter(item => item.element.id === node.id);
  const patentLinks = patentLinksQuery.data ?? [];

  const columns = [
    {
      title: 'Обозначение',
      dataIndex: 'designation',
      key: 'designation',
      render: (value: string, row: (typeof elementItems)[number]) => (
        <Link to={`/sw/items/${row.id}`} className={styles.itemLink}>
          {value}
        </Link>
      ),
    },
    {
      title: 'Краткое наименование',
      dataIndex: 'shortName',
      key: 'shortName',
    },
    {
      title: 'Вид разработки',
      dataIndex: 'developmentKindCode',
      key: 'developmentKindCode',
      render: (code: string) => (
        <Tag bordered={false}>{kindByCode.get(code) ?? code}</Tag>
      ),
    },
    {
      title: 'Документы',
      dataIndex: 'documentsCount',
      key: 'documentsCount',
      width: 110,
    },
  ];

  return (
    <div className={styles.detailStack}>
      <div className={styles.detailHeaderCard}>
        <div className={styles.detailTitleRow}>
          <div>
            <h2 className={styles.detailTitle}>
              {node.code} — {node.name}
            </h2>
            <div className={styles.detailBadges}>
              <Tag>{typeByCode.get(node.elementTypeCode) ?? node.elementTypeCode}</Tag>
              <Tag color={isArchived ? 'default' : 'success'} bordered={false}>
                {isArchived ? 'архивная' : 'действующая'}
              </Tag>
              {node.archivedByCascade ? (
                <Tag bordered={false}>архивирована каскадом</Tag>
              ) : null}
            </div>
          </div>
          {canEdit ? (
            <div className={styles.detailActions}>
              <Button icon={<EditOutlined />} onClick={() => actions.onEdit(node)}>
                Изменить
              </Button>
              {isArchived ? (
                <Button icon={<UndoOutlined />} loading={restoreLoading} onClick={() => actions.onRestore(node)}>
                  Вернуть из архива
                </Button>
              ) : (
                <>
                  <Button
                    loading={archiveLoading}
                    onClick={() =>
                      modal.confirm({
                        title: 'Перевести ветку в архив?',
                        content: 'Вложенные элементы и программы уйдут в архив каскадом.',
                        okText: 'В архив',
                        okButtonProps: { danger: true },
                        onOk: () => actions.onArchive(node),
                      })
                    }
                  >
                    В архив
                  </Button>
                  <Button
                    type='primary'
                    danger
                    icon={<DeleteOutlined />}
                    loading={markDeletedLoading}
                    onClick={() =>
                      modal.confirm({
                        title: 'Пометить ветку удалённой?',
                        content: 'Элементы, программы и документы исчезнут из реестра и свода. Действие необратимо.',
                        okText: 'Пометить удалённым',
                        okButtonProps: { danger: true },
                        onOk: () => actions.onMarkDeleted(node),
                      })
                    }
                  >
                    Пометить удалённым
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Основные сведения</h3>
        <div className={styles.infoRows}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Код элемента</span>
            <span className={styles.infoValue}>
              <Tag bordered={false} className={styles.infoCodeTag}>
                {node.code}
              </Tag>
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Тип элемента</span>
            <span className={`${styles.infoValue} ${styles.infoValuePlain}`}>
              {typeByCode.get(node.elementTypeCode) ?? node.elementTypeCode}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Вышестоящий элемент</span>
            {parent ? (
              <Link
                to={`/sw/structure?elementId=${parent.id}`}
                className={styles.infoLink}
                onClick={() => actions.onSelectParent(parent)}
              >
                {elementTitle(parent.code, parent.name)}
              </Link>
            ) : (
              <span className={styles.infoValue}>—</span>
            )}
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Описание</span>
            <span className={`${styles.infoValue} ${styles.infoValueMultiline}`}>
              {node.description?.trim() || '—'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          Связи с РИД
          {patentLinks.length ? <span className={styles.cardTitleCount}>{patentLinks.length}</span> : null}
        </h3>
        {patentLinksQuery.isLoading ? (
          <Spin size='small' />
        ) : patentLinks.length === 0 ? (
          <div className={styles.emptyHint}>
            Нет связей с реестром РИД у программ этого элемента
          </div>
        ) : (
          <div className={styles.infoRows}>
            {patentLinks.map(link => (
              <div key={link.id} className={styles.infoRow}>
                <Link to={`/sw/items/${link.software.id}`} className={styles.ridSoftwareLabel}>
                  {elementTitle(link.software.designation, link.software.shortName)}
                </Link>
                <div className={styles.infoValue}>
                  <Link to={`/patents/${link.patentId}`} className={styles.infoLink}>
                    {patentLabel(link.patent.registrationNumber, link.patent.name)}
                  </Link>
                  {link.patent.isDeleted ? (
                    <span className={styles.ridDeletedHint}> · удалена</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.cardTitle}>Ответственные</h3>
          {canEdit && !isArchived ? (
            <Button type='link' icon={<PlusOutlined />} onClick={() => actions.onAssign(node)}>
              Назначить
            </Button>
          ) : null}
        </div>
        {node.responsibles.length === 0 ? (
          <div className={styles.emptyHint}>Ответственные не назначены</div>
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
              {canEdit && !isArchived ? (
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

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.cardTitle}>
            Программное обеспечение элемента
            {elementItems.length ? <span className={styles.cardTitleCount}>{elementItems.length}</span> : null}
          </h3>
          <Link to={`/sw/items?elementId=${node.id}`}>
            <Button type='link'>Открыть в реестре</Button>
          </Link>
        </div>
        {itemsQuery.isLoading ? (
          <Spin size='small' />
        ) : elementItems.length === 0 ? (
          <div className={styles.emptyHint}>Программ на этом элементе пока нет</div>
        ) : (
          <Table rowKey='id' size='small' pagination={false} columns={columns} dataSource={elementItems} />
        )}
      </div>
    </div>
  );
}
