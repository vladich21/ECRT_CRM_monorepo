import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, Col, Modal, Row, Spin, Tooltip, Typography, Upload } from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';

import { triggerFileDownload } from '../../../components/filePreview/FilePreviewModal';
import { fileApi } from '../../../api/files/fileApi';
import { useDeleteFile, useFilesByEntity } from '../../../api/files/fileApiHooks';
import { fileQueryKeys } from '../../../api/files/fileQueryKeys';
import { useUpdatePartner } from '../../../api/partners/partnerApiHooks';
import { invalidatePartnerQueries } from '../../../api/partners/partnerQueryKeys';
import { useOpenAntdDeleteConfirm } from '../../../customhooks/confirmDelete';
import { useNotification } from '@/hooks/notifications/useNotification';
import type { MyFile } from '../../../types/files';
import type { Partner } from '../../../types/partner';
import { formatFileSizeStr } from '../../../utils/formatFileSize';
import styles from './PartnerVerificationTab.module.scss';

const { Text, Title } = Typography;
const { Dragger } = Upload;

const LEGAL_ENTITY_TYPE = 'partner-legal';
const QUESTIONNAIRE_ENTITY_TYPE = 'partner-questionnaire';

type VerificationStatus = 'passed' | 'failed' | 'pending';

function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />;
  if (['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ color: '#1677ff', fontSize: 20 }} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return <FileImageOutlined style={{ color: '#722ed1', fontSize: 20 }} />;
  return <FileOutlined style={{ color: '#8c8c8c', fontSize: 20 }} />;
}

function resolveLegalStatus(partner: Partner | undefined): VerificationStatus {
  if (partner?.legal_check_failed) return 'failed';
  if (partner?.legal_check_passed) return 'passed';
  return 'pending';
}

type SectionProps = {
  title: string;
  description: string;
  entityType: string;
  partnerId: string;
  status: VerificationStatus;
  passedLabel: string;
  failedLabel?: string;
  pendingLabel: string;
  failToggle?: {
    checked: boolean;
    loading: boolean;
    onChange: (checked: boolean) => void;
  };
  onAfterChange: () => void;
};

function StatusBadge({
  status,
  passedLabel,
  failedLabel,
  pendingLabel,
}: {
  status: VerificationStatus;
  passedLabel: string;
  failedLabel?: string;
  pendingLabel: string;
}) {
  if (status === 'passed') {
    return (
      <div className={styles.statusBadge} data-status='passed'>
        <CheckCircleFilled className={styles.iconSuccess} />
        <span>{passedLabel}</span>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className={styles.statusBadge} data-status='failed'>
        <CloseCircleFilled className={styles.iconFailed} />
        <span>{failedLabel ?? 'Проверка не пройдена'}</span>
      </div>
    );
  }
  return (
    <div className={styles.statusBadge} data-status='pending'>
      <ClockCircleOutlined className={styles.iconPending} />
      <span>{pendingLabel}</span>
    </div>
  );
}

function VerificationSection({
  title,
  description,
  entityType,
  partnerId,
  status,
  passedLabel,
  failedLabel,
  pendingLabel,
  failToggle,
  onAfterChange,
}: SectionProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const [uploading, setUploading] = useState(false);
  const pendingDeleteId = useRef('');
  const deleteFileMutation = useDeleteFile();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const { data: files = [], isLoading } = useFilesByEntity(entityType, partnerId);

  const handleUpload = async (options: UploadRequestOption) => {
    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;
    const sizeStr = String(uploadFile.size);
    if (files.some(f => f.name === uploadFile.name && String(f.size) === sizeStr)) {
      showNotification('warning', 'Внимание', 'Файл с таким именем уже загружен');
      onError?.(new Error('Duplicate'));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file1', uploadFile);
      formData.append('entityType', entityType);
      formData.append('entityId', partnerId);
      await fileApi.uploadFiles(formData);
      await queryClient.invalidateQueries({ queryKey: fileQueryKeys.byEntity(entityType, partnerId) });
      onSuccess?.('ok');
      showNotification('success', 'Файл загружен', 'Документ успешно добавлен');
      onAfterChange();
    } catch {
      onError?.(new Error('Upload failed'));
      showNotification('error', 'Ошибка', 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    pendingDeleteId.current = fileId;
    openDeleteConfirm({
      mutation: deleteFileMutation,
      getVariables: () => ({ entityType, entityId: partnerId, fileId: pendingDeleteId.current }),
      showNotification,
      successMessage: 'Файл удален',
      errorMessage: 'Не удалось удалить файл',
      navigate,
      onMutationSuccess: () => {
        onAfterChange();
      },
    });
  };

  return (
    <div className={styles.section}>
      {contextHolder}
      <div className={styles.sectionHeader}>
        <div>
          <Title level={5} className={styles.sectionTitle}>{title}</Title>
          <Text type='secondary' className={styles.sectionDesc}>{description}</Text>
        </div>
        <StatusBadge
          status={status}
          passedLabel={passedLabel}
          failedLabel={failedLabel}
          pendingLabel={pendingLabel}
        />
      </div>

      {failToggle && (
        <Checkbox
          checked={failToggle.checked}
          disabled={failToggle.loading}
          onChange={e => failToggle.onChange(e.target.checked)}
        >
          Проверка не пройдена
        </Checkbox>
      )}

      <Spin spinning={uploading || isLoading || Boolean(failToggle?.loading)}>
        <Dragger
          multiple={false}
          showUploadList={false}
          customRequest={handleUpload}
          className={styles.dragger}
        >
          <p className={styles.draggerIconWrap}>
            <InboxOutlined className={styles.draggerIcon} />
          </p>
          <p className={styles.draggerText}>
            Перетащите файл или <span className={styles.draggerLink}>нажмите для выбора</span>
          </p>
          <p className={styles.draggerHint}>PDF, Word, Excel, изображения</p>
        </Dragger>

        {files.length > 0 && (
          <div className={styles.fileList}>
            {files.map((file: MyFile) => (
              <div
                key={file.id}
                className={styles.fileRow}
                onClick={() => triggerFileDownload(file.url, file.name)}
              >
                <span className={styles.fileIcon}>{getFileIcon(file.name)}</span>
                <div className={styles.fileMeta}>
                  <Text className={styles.fileName} title={file.name}>{file.name}</Text>
                  <Text type='secondary' className={styles.fileSize}>{formatFileSizeStr(file.size)}</Text>
                </div>
                <Tooltip title='Удалить'>
                  <Button
                    size='small'
                    danger
                    icon={<DeleteOutlined />}
                    className={styles.deleteBtn}
                    onClick={e => handleDelete(e, file.id)}
                  />
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
}

export default function PartnerVerificationTab() {
  const partner = useOutletContext<Partner>();
  const { partnerId } = useParams();
  const queryClient = useQueryClient();
  const { contextHolder, showNotification } = useNotification();
  const updatePartner = useUpdatePartner();

  const handleAfterChange = () => {
    void invalidatePartnerQueries(queryClient);
  };

  const applyLegalFailed = (failed: boolean) => {
    if (!partnerId) return;
    updatePartner.mutate(
      { id: partnerId, data: { legal_check_failed: failed } },
      {
        onSuccess: () => {
          showNotification(
            'success',
            'Статус обновлен',
            failed ? 'Установлен статус «Проверка не пройдена»' : 'Статус «Проверка не пройдена» снят',
          );
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось обновить статус юридической проверки');
        },
      },
    );
  };

  const handleLegalFailedChange = (checked: boolean) => {
    if (checked) {
      Modal.confirm({
        title: 'Проверка не пройдена',
        content: 'Установить статус юридической проверки «Проверка не пройдена»? Статус «Проверка пройдена» будет снят.',
        okText: 'Установить',
        okButtonProps: { danger: true },
        cancelText: 'Отмена',
        onOk: () => applyLegalFailed(true),
      });
      return;
    }
    applyLegalFailed(false);
  };

  const legalStatus = resolveLegalStatus(partner);

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card className={styles.card}>
            <VerificationSection
              title='Юридическая проверка'
              description='Загрузите документы юридической проверки контрагента'
              entityType={LEGAL_ENTITY_TYPE}
              partnerId={partnerId!}
              status={legalStatus}
              passedLabel='Проверка пройдена'
              failedLabel='Проверка не пройдена'
              pendingLabel='Ожидает проверки'
              failToggle={{
                checked: Boolean(partner?.legal_check_failed),
                loading: updatePartner.isPending,
                onChange: handleLegalFailedChange,
              }}
              onAfterChange={handleAfterChange}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className={styles.card}>
            <VerificationSection
              title='Анкетирование'
              description='Загрузите заполненную анкету контрагента'
              entityType={QUESTIONNAIRE_ENTITY_TYPE}
              partnerId={partnerId!}
              status={partner?.questionnaire_filled ? 'passed' : 'pending'}
              passedLabel='Анкета получена'
              pendingLabel='Анкета не получена'
              onAfterChange={handleAfterChange}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
