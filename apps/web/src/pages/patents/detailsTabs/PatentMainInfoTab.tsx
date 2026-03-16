import {
  FileTextOutlined,
  CalendarOutlined,
  NumberOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';
import { Patent } from '../../../types/patent';
import { useOutletContext } from 'react-router-dom';
import { getEntityById } from '../../../helpers/getEntityById';
import styles from './PatentMainInfoTab.module.scss';

function formatDate(dateString: string) {
  return dateString ? new Date(dateString).toLocaleDateString('ru-RU') : '—';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function PatentMainInfo({ patent }: { patent: Patent }) {
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

  if (isReferencesLoading) return <Loader />;
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage="Не подгрузились справочники" />;
  }

  const ipTypeName = getNameById(patent.intellectprop_id, referenceBooks?.patentIntellectProps);
  const statusName = getNameById(patent.status_id, referenceBooks?.patentStatuses);
  const deptName = getNameById(patent.department_id, referenceBooks?.departments);
  const projectName = getNameById(patent.project_id, referenceBooks?.projects);
  const projectCode = getEntityById(patent.project_id, referenceBooks?.projects)?.code;
  const contract = referenceBooks.contracts?.find((el) => el.id === patent.contract_id);
  const authorNames = (patent.author_ids ?? [])
    .map((id) => referenceBooks?.users?.find((u) => u.id === id)?.name)
    .filter(Boolean) as string[];
  const areaNames = (patent.area_ids ?? [])
    .map((id) => referenceBooks?.patentAreas?.find((a) => a.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className={styles.layout}>
      {/* ─── Left column ─────────────────────────────────────────────── */}
      <div className={styles.leftColumn}>
        {/* KPI tiles */}
        <div className={styles.kpiRow}>
          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{patent.registration_number || '—'}</div>
                <div className={styles.kpiLabel}>Рег. номер (ИЦ ЖТ)</div>
              </div>
              <div className={styles.kpiIcon} style={{ background: '#e6f4ff', color: '#1677ff' }}>
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
              <div className={styles.kpiIcon} style={{ background: '#f6ffed', color: '#52c41a' }}>
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
              <div className={styles.kpiIcon} style={{ background: '#f9f0ff', color: '#722ed1' }}>
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
              <div className={styles.kpiIcon} style={{ background: '#fff7e6', color: '#d48806' }}>
                <FileTextOutlined />
              </div>
            </div>
          </div>
        </div>

        {/* Основные сведения */}
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
                  {areaNames.map((name) => (
                    <span key={name} className={styles.areaTag}>{name}</span>
                  ))}
                </div>
              ) : (
                <span className={styles.infoValueMuted}>Не указано</span>
              )}
            </div>
          </div>
        </div>

        {/* Регистрационные данные */}
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

      {/* ─── Right sidebar ───────────────────────────────────────────── */}
      <div className={styles.sidebar}>
        {/* Классификация */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Классификация</h3>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Объект ИС</span>
              <span className={ipTypeName ? styles.infoValue : styles.infoValueMuted}>
                {ipTypeName || '—'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Статус</span>
              <span className={statusName ? styles.infoValue : styles.infoValueMuted}>
                {statusName || '—'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Отдел</span>
              <span className={deptName ? styles.infoValue : styles.infoValueMuted}>
                {deptName || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Документация */}
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
              <span className={contract ? styles.infoValue : styles.infoValueMuted}>
                {contract ? contract.number : 'Не указан'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Шифр договора</span>
              <span className={contract?.cipher ? styles.infoValue : styles.infoValueMuted}>
                {contract?.cipher || 'Не указан'}
              </span>
            </div>
          </div>
        </div>

        {/* Авторы (Исполнители) */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <TeamOutlined style={{ marginRight: 6 }} />
            Авторы ({authorNames.length})
          </h3>
          {authorNames.length > 0 ? (
            authorNames.map((name) => (
              <div key={name} className={styles.authorItem}>
                <div className={styles.authorAvatar}>{getInitials(name)}</div>
                <span className={styles.authorName}>{name}</span>
              </div>
            ))
          ) : (
            <span className={styles.infoValueMuted} style={{ fontSize: 13 }}>Не указаны</span>
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
