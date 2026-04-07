import {
  CheckCircleFilled,
  ClockCircleOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Row, Spin, Tooltip, Typography, Upload } from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';

import { triggerFileDownload } from '../../../components/filePreview/FilePreviewModal';
import { fileApi } from '../../../api/files/fileApi';
import { useDeleteFile, useFilesByEntity } from '../../../api/files/fileApiHooks';
import { fileQueryKeys } from '../../../api/files/fileQueryKeys';
import { useUpdatePartner } from '../../../api/partners/partnerApiHooks';
import { openAntdDeleteConfirm } from '../../../customhooks/confirmDelete/openAntdDeleteConfirm';
import { useNotification } from '../../../customhooks/useNotification';
import type { MyFile } from '../../../types/files';
import type { Partner } from '../../../types/partner';
import { formatFileSizeStr } from '../../../utils/formatFileSize';
import styles from './PartnerVerificationTab.module.scss';

const { Text, Title } = Typography;
const { Dragger } = Upload;

const LEGAL_ENTITY_TYPE = 'partner-legal';
const QUESTIONNAIRE_ENTITY_TYPE = 'partner-questionnaire';

function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />;
  if (['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ color: '#1677ff', fontSize: 20 }} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return <FileImageOutlined style={{ color: '#722ed1', fontSize: 20 }} />;
  return <FileOutlined style={{ color: '#8c8c8c', fontSize: 20 }} />;
}


type SectionProps = {
  title: string;
  description: string;
  entityType: string;
  partnerId: string;
  isConfirmed: boolean;
  confirmedLabel: string;
  pendingLabel: string;
  onAfterUpload: () => void;
  onAfterDeleteLast: () => void;
};

function VerificationSection({
  title,
  description,
  entityType,
  partnerId,
  isConfirmed,
  confirmedLabel,
  pendingLabel,
  onAfterUpload,
  onAfterDeleteLast,
}: SectionProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const [uploading, setUploading] = useState(false);
  const pendingDeleteId = useRef('');
  const deleteFileMutation = useDeleteFile();
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
      onAfterUpload();
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
    openAntdDeleteConfirm({
      mutation: deleteFileMutation,
      getVariables: () => ({ entityType, entityId: partnerId, fileId: pendingDeleteId.current }),
      showNotification,
      successMessage: 'Файл удалён',
      errorMessage: 'Не удалось удалить файл',
      navigate,
      onMutationSuccess: () => {
        if (files.length <= 1) {
          onAfterDeleteLast();
        }
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
        <div className={styles.statusBadge} data-confirmed={String(isConfirmed)}>
          {isConfirmed ? (
            <><CheckCircleFilled className={styles.iconSuccess} /> <span>{confirmedLabel}</span></>
          ) : (
            <><ClockCircleOutlined className={styles.iconPending} /> <span>{pendingLabel}</span></>
          )}
        </div>
      </div>

      <Spin spinning={uploading || isLoading}>
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
  const { mutate: updatePartner } = useUpdatePartner();
  const { showNotification } = useNotification();

  const setFlag = (field: 'legal_check_passed' | 'questionnaire_filled', value: boolean) => {
    if (!partnerId) return;
    updatePartner(
      { id: partnerId, data: { [field]: value } as Partial<Partner> },
      {
        onError: () => showNotification('error', 'Ошибка', 'Не удалось обновить статус проверки'),
      },
    );
  };

  return (
    <div className={styles.wrap}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card className={styles.card}>
            <VerificationSection
              title='Юридическая проверка'
              description='Загрузите документы юридической проверки контрагента'
              entityType={LEGAL_ENTITY_TYPE}
              partnerId={partnerId!}
              isConfirmed={Boolean(partner?.legal_check_passed)}
              confirmedLabel='Проверка пройдена'
              pendingLabel='Ожидает проверки'
              onAfterUpload={() => setFlag('legal_check_passed', true)}
              onAfterDeleteLast={() => setFlag('legal_check_passed', false)}
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
              isConfirmed={Boolean(partner?.questionnaire_filled)}
              confirmedLabel='Анкета получена'
              pendingLabel='Анкета не получена'
              onAfterUpload={() => setFlag('questionnaire_filled', true)}
              onAfterDeleteLast={() => setFlag('questionnaire_filled', false)}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
