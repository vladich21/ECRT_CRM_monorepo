import { useState } from 'react';
import { CloudUploadOutlined, FileWordOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Alert, Button, Radio, Upload } from 'antd';

import type { SvnEntry } from '@/components/svnPicker/svnApi';
import { SvnPickerModal } from '@/components/svnPicker/SvnPickerModal';
import type { SwDocumentFileRef } from '@/types/swRegistry';

import styles from './SwRegistryModals.module.scss';

/** Выбранный источник копии: либо путь в SVN, либо файл с компьютера. */
export type SwFileChoice = { svnPath?: string; localFile?: File };

type FileSource = 'svn' | 'upload';

interface Props {
  /** Заголовок секции: «Файл документа», «Файл листа утверждения». */
  title: string;
  /** Текущая копия записи — видно, что заменяем. */
  current?: SwDocumentFileRef | null;
  svnEnabled?: boolean;
  /** Каталог программы в SVN: проводник открывается сразу в нём. */
  svnFolderPath?: string | null;
  dropText?: string;
  value: SwFileChoice | null;
  onChange: (choice: SwFileChoice | null) => void;
}

/**
 * Выбор копии для записи реестра: из SVN конструкторов или файлом с компьютера.
 * Один блок на все окна — иначе правки расходятся: раньше в листе утверждения
 * текущий файл показывался иначе, чем в документе.
 */
export function SwFileSourcePicker({
  title,
  current,
  svnEnabled,
  svnFolderPath,
  dropText = 'Перетащите файл или нажмите для выбора',
  value,
  onChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [source, setSource] = useState<FileSource>(svnEnabled ? 'svn' : 'upload');

  const pickSvn = (entry: SvnEntry) => {
    onChange({ svnPath: entry.path });
    setPickerOpen(false);
  };

  return (
    <>
      <div className={styles.formSectionTitle}>{title}</div>
      <div className={styles.fileBlock}>
        {svnEnabled ? (
          <Radio.Group
            className={styles.fileSourceSwitch}
            optionType='button'
            size='small'
            value={source}
            onChange={e => {
              setSource(e.target.value as FileSource);
              onChange(null);
            }}
            options={[
              { value: 'svn', label: 'Из SVN' },
              { value: 'upload', label: 'С компьютера' },
            ]}
          />
        ) : null}

        {source === 'svn' ? (
          value?.svnPath ? (
            <Alert
              type='success'
              showIcon
              icon={<FileWordOutlined />}
              message={value.svnPath.split('/').pop() ?? value.svnPath}
              description={value.svnPath}
              action={
                <Button size='small' onClick={() => onChange(null)}>
                  Убрать
                </Button>
              }
            />
          ) : (
            <>
              {current ? (
                <div className={styles.currentFileLine} title={current.svnPath ?? undefined}>
                  <FileWordOutlined /> {current.filename}
                  {current.svnRevision ? ` · SVN r${current.svnRevision}` : ''}
                </div>
              ) : null}
              <Button icon={<FolderOpenOutlined />} onClick={() => setPickerOpen(true)}>
                {current ? 'Заменить файлом из SVN' : 'Выбрать файл в SVN'}
              </Button>
            </>
          )
        ) : value?.localFile ? (
          <Alert
            type='success'
            showIcon
            icon={<FileWordOutlined />}
            message={value.localFile.name}
            description={`${Math.round(value.localFile.size / 1024)} КБ`}
            action={
              <Button size='small' onClick={() => onChange(null)}>
                Убрать
              </Button>
            }
          />
        ) : (
          <>
            {current ? (
              <div className={styles.currentFileLine} title={current.svnPath ?? undefined}>
                <FileWordOutlined /> {current.filename}
              </div>
            ) : null}
            <Upload.Dragger
              multiple={false}
              showUploadList={false}
              beforeUpload={file => {
                onChange({ localFile: file });
                return Upload.LIST_IGNORE;
              }}
            >
              <p className='ant-upload-drag-icon'>
                <CloudUploadOutlined />
              </p>
              <p className='ant-upload-text'>{dropText}</p>
            </Upload.Dragger>
          </>
        )}
      </div>

      {pickerOpen ? (
        <SvnPickerModal
          open
          mode='select'
          startPath={svnFolderPath ?? ''}
          currentPath={current?.svnPath ?? null}
          onClose={() => setPickerOpen(false)}
          onSelect={pickSvn}
        />
      ) : null}
    </>
  );
}
