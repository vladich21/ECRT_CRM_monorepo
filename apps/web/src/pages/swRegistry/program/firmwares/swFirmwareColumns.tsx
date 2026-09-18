import { CloudUploadOutlined, DeleteOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Dropdown, Tooltip, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { SwFirmware, SwFirmwareVersion } from '@/types/swRegistry';
import { formatFileSize } from '@/utils/formatFileSize';

import styles from './SwFirmwaresTab.module.scss';
import { formatDate, type FirmwareTreeRow } from './swFirmwareTree';

/** Действия строки: у прошивки своё меню, у прежней версии — только скачать и удалить. */
export type FirmwareRowActions = {
  canEdit?: boolean;
  onUploadVersion: (firmware: SwFirmware) => void;
  onDownload: (version: SwFirmwareVersion) => void;
  onRename: (firmware: SwFirmware) => void;
  onRemoveVersion: (firmware: SwFirmware, version: SwFirmwareVersion) => void;
  onRemoveFirmware: (firmware: SwFirmware) => void;
};

export function buildFirmwareColumns({
  canEdit,
  onUploadVersion,
  onDownload,
  onRename,
  onRemoveVersion,
  onRemoveFirmware,
}: FirmwareRowActions): ColumnsType<FirmwareTreeRow> {
  return [
    {
      title: 'Прошивка',
      key: 'name',
      ellipsis: true,
      render: (_, row) => (
        <div>
          <div className={row.kind === 'firmware' ? styles.firmwareName : styles.pastName}>{row.firmware.name}</div>
          {row.kind === 'firmware' && row.firmware.note ? <div className={styles.note}>{row.firmware.note}</div> : null}
        </div>
      ),
    },
    {
      title: 'Версия',
      key: 'version',
      width: 140,
      render: (_, row) => {
        if (!row.version) return '—';
        if (row.kind === 'firmware') {
          return <span className={styles.currentVersion}>{row.version.version}</span>;
        }
        return <span className={styles.pastVersion}>{row.version.version}</span>;
      },
    },
    {
      title: 'Файл',
      key: 'file',
      ellipsis: true,
      render: (_, row) =>
        row.version ? (
          <span className={styles.filename} title={row.version.filename}>
            {row.version.filename}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Размер',
      key: 'size',
      width: 110,
      render: (_, row) => (row.version ? formatFileSize(row.version.sizeBytes ?? 0) : '—'),
    },
    {
      title: 'Сборка',
      key: 'builtAt',
      width: 120,
      render: (_, row) => formatDate(row.version?.builtAt ?? null),
    },
    {
      title: 'Загружена',
      key: 'createdAt',
      width: 180,
      render: (_, row) => {
        if (!row.version) return '—';
        const who = row.version.createdByName ? `, ${row.version.createdByName}` : '';
        return `${formatDate(row.version.createdAt)}${who}`;
      },
    },
    {
      title: 'SHA-256',
      key: 'sha256',
      width: 100,
      render: (_, row) =>
        row.version?.sha256 ? (
          <Tooltip title={row.version.sha256}>
            <span className={styles.hash}>{row.version.sha256.slice(0, 8)}</span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: '',
      key: 'actions',
      width: canEdit ? 168 : 48,
      render: (_, row) => {
        const version = row.version;
        if (row.kind === 'firmware') {
          return (
            <div className={styles.actions}>
              {canEdit ? (
                <Button size='small' icon={<CloudUploadOutlined />} onClick={() => onUploadVersion(row.firmware)}>
                  Версия
                </Button>
              ) : null}
              {version ? (
                <Tooltip title='Скачать'>
                  <Button type='text' icon={<DownloadOutlined />} onClick={() => onDownload(version)} />
                </Tooltip>
              ) : null}
              {canEdit ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'rename', icon: <EditOutlined />, label: 'Переименовать' },
                      ...(version
                        ? ([
                            {
                              key: 'deleteVersion',
                              icon: <DeleteOutlined />,
                              label: 'Удалить текущую версию',
                              danger: true,
                            },
                          ] satisfies MenuProps['items'])
                        : []),
                      { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить прошивку', danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'rename') onRename(row.firmware);
                      if (key === 'deleteVersion' && version) onRemoveVersion(row.firmware, version);
                      if (key === 'delete') onRemoveFirmware(row.firmware);
                    },
                  }}
                >
                  <Button type='text'>⋯</Button>
                </Dropdown>
              ) : null}
            </div>
          );
        }
        if (!version) return null;
        return (
          <div className={styles.actions}>
            <Tooltip title='Скачать'>
              <Button type='text' size='small' icon={<DownloadOutlined />} onClick={() => onDownload(version)} />
            </Tooltip>
            {canEdit ? (
              <Tooltip title='Удалить версию'>
                <Button
                  type='text'
                  size='small'
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onRemoveVersion(row.firmware, version)}
                />
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
  ];
}
