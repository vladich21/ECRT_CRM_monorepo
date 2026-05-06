import {
  CalendarOutlined,
  FileTextOutlined,
  NumberOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import { useContractById } from '@/api/contracts/contractApiHooks';
import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import { patentRidWorkflowKind } from '@/constants/patentRidWorkflowKind';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { Patent } from '@/types/patent';
import {
  earliestPatentRequestsDeadlineFromFiles,
  formatPatentStatusDisplayName,
} from '@/pages/patents/utils/patentStatusDisplay';
import styles from './PatentMainInfoTab.module.scss';

function formatDate(dateString: string) {
  return dateString ? new Date(dateString).toLocaleDateString('ru-RU') : '—';
}
function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}
export default function PatentMainInfo({ patent }: { patent: Patent }) {
  const { data: patentFiles } = useFilesByEntity('patent', patent.id);
  const requestsEarliestDeadline = useMemo(
    () => earliestPatentRequestsDeadlineFromFiles(patentFiles),
    [patentFiles],
  );
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData([
    'departments',
    'users',
    'contracts',
    'projects',
    'patentIntellectProps',
    'patentStatuses',
    'patentAreas',
  ]);
  const incomeContractInPicker = (referenceBooks?.contracts ?? []).some(
    row => row.id === patent.contract_id,
  );
  const fetchIncomeContractById =
    Boolean(patent.contract_id && referenceBooks && !incomeContractInPicker);
  const { data: incomeContractFetched } = useContractById(
    fetchIncomeContractById ? patent.contract_id : '',
  );
  if (isReferencesLoading) return <Loader />;
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не подгрузились справочники' />;
  }
  const ipTypeName = getNameById(patent.intellectprop_id, referenceBooks?.patentIntellectProps);
  const statusName = getNameById(patent.status_id, referenceBooks?.patentStatuses);
  const deptName = getNameById(patent.department_id, referenceBooks?.departments);
  const responsibleName = getNameById(patent.responsible_for_patenting_id, referenceBooks.users);
  const projectName = getNameById(patent.project_id, referenceBooks?.projects);
  const projectCode = getEntityById(patent.project_id, referenceBooks?.projects)?.code;
  const statusDisplay = formatPatentStatusDisplayName(statusName, requestsEarliestDeadline);
  const incomeContract =
    referenceBooks.contracts?.find(row => row.id === patent.contract_id) ??
    (incomeContractFetched?.id === patent.contract_id ? incomeContractFetched : undefined);
  const authorNames = (patent.author_ids ?? [])
    .map(id => referenceBooks.users?.find(user => user.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const areaNames = (patent.area_ids ?? [])
    .map(id => referenceBooks.patentAreas?.find(area => area.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  const showTransformationCard =
    Boolean(patent.transformed_into_patent_id) ||
    Boolean(patent.transformed_from_patent_id) ||
    Boolean(patent.transformation_notification_ic_zht?.trim()) ||
    Boolean(patent.transformation_notification_cir?.trim()) ||
    patentRidWorkflowKind(statusName) === 'transformation';

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <div className={styles.kpiRow}>
          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{patent.registration_number || '—'}</div>
                <div className={styles.kpiLabel}>Рег. номер (ИЦ ЖТ)</div>
              </div>
              <div className={styles.kpiIcon}>
                <NumberOutlined />
              </div>
            </div>
          </div>

          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{formatDate(patent.registration_date)}</div>
                <div className={styles.kpiLabel}>Дата регистрации</div>
              </div>
              <div className={styles.kpiIcon}>
                <CalendarOutlined />
              </div>
            </div>
          </div>

          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{patent.registration_number_cir || '—'}</div>
                <div className={styles.kpiLabel}>Рег. номер (ЦИР)</div>
              </div>
              <div className={styles.kpiIcon}>
                <SafetyCertificateOutlined />
              </div>
            </div>
          </div>

          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{patent.kd_number || '—'}</div>
                <div className={styles.kpiLabel}>Номер КД</div>
              </div>
              <div className={styles.kpiIcon}>
                <FileTextOutlined />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.twoColCards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Основные сведения</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Наименование РИД</span>
                <span className={patent.name ? styles.infoValue : styles.infoValueMuted}>
                  {patent.name || 'Не указано'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Проект</span>
                <span className={projectName ? styles.infoValueWide : styles.infoValueMuted}>
                  {projectName || 'Не указан'}
                </span>
              </div>
              {projectCode && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Номер проекта</span>
                  <span className={styles.infoValue}>{projectCode}</span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Область применения</span>
                {areaNames.length > 0 ? (
                  <div className={styles.tagsWrap}>
                    {areaNames.map(name => (
                      <span key={name} className={styles.areaTag}>
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.infoValueMuted}>Не указано</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Регистрационные данные</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Номер регистрации (ИЦ ЖТ)</span>
                <span className={patent.registration_number ? styles.infoValue : styles.infoValueMuted}>
                  {patent.registration_number || 'Не указан'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Дата регистрации (ИЦ ЖТ)</span>
                <span className={styles.infoValue}>{formatDate(patent.registration_date)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Номер регистрации (ЦИР)</span>
                <span className={patent.registration_number_cir ? styles.infoValue : styles.infoValueMuted}>
                  {patent.registration_number_cir || 'Не указан'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Дата регистрации (ЦИР)</span>
                <span className={styles.infoValue}>{formatDate(patent.registration_date_cir)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Номер патентной заявки</span>
                <span className={patent.application_number ? styles.infoValue : styles.infoValueMuted}>
                  {patent.application_number || 'Не указан'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sidebar}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Классификация</h3>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Объект ИС</span>
              <span className={ipTypeName ? styles.infoValue : styles.infoValueMuted}>{ipTypeName || '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Статус</span>
              <span className={statusDisplay ? styles.infoValue : styles.infoValueMuted}>
                {statusDisplay || '—'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Отдел</span>
              <span className={deptName ? styles.infoValue : styles.infoValueMuted}>{deptName || '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ответственный за патентование</span>
              <span className={responsibleName ? styles.infoValue : styles.infoValueMuted}>
                {responsibleName || '—'}
              </span>
            </div>
          </div>
        </div>

        {showTransformationCard ? (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <SwapOutlined style={{ marginRight: 6 }} />
              Преобразование РИД
            </h3>
            <div className={styles.infoRows}>
              {patent.transformed_into_patent_id ? (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Преобразован в РИД</span>
                  <Link
                    to={`/patents/${patent.transformed_into_patent_id}`}
                    className={`${styles.infoValue} ${styles.contractRegistryLink}`}
                  >
                    {patent.transformation_target_registration_number?.trim() ||
                      patent.transformed_into_patent_id}
                  </Link>
                </div>
              ) : null}
              {patent.transformed_from_patent_id ? (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Продолжение РИД</span>
                  <Link
                    to={`/patents/${patent.transformed_from_patent_id}`}
                    className={`${styles.infoValue} ${styles.contractRegistryLink}`}
                  >
                    {patent.transformation_source_registration_number?.trim() ||
                      patent.transformed_from_patent_id}
                  </Link>
                </div>
              ) : null}
              {patent.transformation_notification_ic_zht?.trim() ? (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Уведомление ИЦ ЖТ</span>
                  <span className={styles.infoValue}>{patent.transformation_notification_ic_zht}</span>
                </div>
              ) : null}
              {patent.transformation_notification_cir?.trim() ? (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Уведомление ЦИР</span>
                  <span className={styles.infoValue}>{patent.transformation_notification_cir}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Документация</h3>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Номер КД</span>
              <span className={patent.kd_number ? styles.infoValue : styles.infoValueMuted}>
                {patent.kd_number || 'Не указан'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Договор (доходный)</span>
              {incomeContract?.id ? (
                <Link
                  to={`/contracts/${incomeContract.id}`}
                  state={{ from: `/patents/${patent.id}` }}
                  className={`${styles.infoValue} ${styles.contractRegistryLink}`}
                >
                  {incomeContract.number?.trim() || incomeContract.name || '—'}
                </Link>
              ) : (
                <span className={styles.infoValueMuted}>Не указан</span>
              )}
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Шифр договора</span>
              <span className={incomeContract?.cipher ? styles.infoValue : styles.infoValueMuted}>
                {incomeContract?.cipher ?? 'Не указан'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <TeamOutlined style={{ marginRight: 6 }} />
            Исполнители ({authorNames.length})
          </h3>
          {authorNames.length > 0 ? (
            authorNames.map(name => (
              <div key={name} className={styles.authorItem}>
                <div className={styles.authorAvatar}>{getInitials(name)}</div>
                <span className={styles.authorName}>{name}</span>
              </div>
            ))
          ) : (
            <span className={styles.infoValueMuted} style={{ fontSize: 13 }}>
              Не указаны
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
export function PatentMainInfoTab() {
  const patent = useOutletContext<Patent>();
  return <PatentMainInfo patent={patent} />;
}
