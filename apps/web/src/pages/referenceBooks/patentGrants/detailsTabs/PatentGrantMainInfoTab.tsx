import {
  BankOutlined,
  CalendarOutlined,
  CopyrightOutlined,
  FileTextOutlined,
  NumberOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import { Link, useOutletContext } from 'react-router-dom';

import { useContractById } from '../../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../../api/hooks/useReferences';
import { usePatentById } from '../../../../api/patents/patentApiHooks';
import { Loader } from '../../../../components/loader/Loader';
import { NotFound } from '../../../../components/notFound/NotFound';
import { getNameById } from '../../../../helpers/getNameById';
import { PatentGrant } from '../../../../types/patent';
import {
  patentGrantStatusTagInlineStyle,
  patentGrantStatusTagPreset,
} from '../constants/patentGrantStatusStyles';
import { getContractDisplayLabel, getPatentExpectedLicenseeIds, getPatentGrantActualLicenseeIds, hasActualLicensee } from '../utils/patentGrantCardHelpers';
import { LicenseeLinks } from './PatentGrantLicenseeLinks';
import styles from './PatentGrantMainInfoTab.module.scss';

const valueLink = `${styles.infoValue} ${styles.infoValueWide} ${styles.registryLink}`;

function formatDate(dateString?: string) {
  return dateString?.trim() ? new Date(dateString).toLocaleDateString('ru-RU') : '—';
}

interface PatentGrantMainInfoProps {
  patentGrant?: PatentGrant;
}

function PatentGrantMainInfo({ patentGrant }: PatentGrantMainInfoProps) {
  const patentId = patentGrant?.patent_id?.trim() ?? '';
  const actualLicenseeIds = getPatentGrantActualLicenseeIds(patentGrant);
  const hasActual = hasActualLicensee(actualLicenseeIds);

  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(['patents', 'partners', 'projects', 'contracts']);
  const { data: linkedPatent, isLoading: isLinkedPatentLoading } = usePatentById(patentId);

  const projectId = linkedPatent?.project_id?.trim() ?? '';
  const contractId = linkedPatent?.contract_id?.trim() ?? '';
  const needContractFetch = Boolean(contractId && referenceBooks && !referenceBooks.contracts?.some(c => c.id === contractId));
  const { data: contractFetched } = useContractById(needContractFetch ? contractId : '');

  if (isReferencesLoading || (patentId && isLinkedPatentLoading)) {
    return <Loader />;
  }

  if (isReferencesError || !referenceBooks || !patentGrant) {
    return <NotFound errorMessage='Справочники не найдены' />;
  }

  const expectedLicenseeIds = hasActual ? [] : getPatentExpectedLicenseeIds(linkedPatent);
  const grantBackPath = `/patent-grants/${patentGrant.id}`;
  const ridName =
    linkedPatent?.name?.trim() ||
    patentGrant.patent_name?.trim() ||
    getNameById(patentGrant.patent_id, referenceBooks.patents)?.trim() ||
    '';
  const ridRegNumber =
    linkedPatent?.registration_number?.trim() || patentGrant.patent_registration_number?.trim() || '';
  const contract =
    referenceBooks.contracts?.find(row => row.id === contractId) ??
    (contractFetched?.id === contractId ? contractFetched : undefined);

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <div className={styles.kpiRow}>
          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={patentGrant.grant_number ? styles.kpiValue : styles.kpiValueMuted}>
                  {patentGrant.grant_number || '—'}
                </div>
                <div className={styles.kpiLabel}>Номер охранного документа</div>
              </div>
              <div className={styles.kpiIcon}>
                <NumberOutlined />
              </div>
            </div>
          </div>

          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                {patentGrant.status ? (
                  <Tag
                    bordered={false}
                    color={patentGrantStatusTagPreset(patentGrant.status)}
                    className={styles.kpiStatusTag}
                    style={patentGrantStatusTagInlineStyle(patentGrant.status)}
                  >
                    {patentGrant.status}
                  </Tag>
                ) : (
                  <div className={styles.kpiValueMuted}>—</div>
                )}
                <div className={styles.kpiLabel}>Статус</div>
              </div>
              <div className={styles.kpiIcon}>
                <SafetyCertificateOutlined />
              </div>
            </div>
          </div>

          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{formatDate(patentGrant.grant_date)}</div>
                <div className={styles.kpiLabel}>Дата выдачи</div>
              </div>
              <div className={styles.kpiIcon}>
                <CalendarOutlined />
              </div>
            </div>
          </div>

          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{formatDate(patentGrant.renewal_date)}</div>
                <div className={styles.kpiLabel}>Дата продления</div>
              </div>
              <div className={styles.kpiIcon}>
                <CalendarOutlined />
              </div>
            </div>
          </div>

          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={patentGrant.office?.trim() ? styles.kpiValue : styles.kpiValueMuted}>
                  {patentGrant.office?.trim() || '—'}
                </div>
                <div className={styles.kpiLabel}>Ведомство</div>
              </div>
              <div className={styles.kpiIcon}>
                <BankOutlined />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.twoColCards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <CopyrightOutlined style={{ marginRight: 6 }} />
              Связанный РИД
            </h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Наименование</span>
                {patentGrant.patent_id ? (
                  <Link
                    to={`/patents/${patentGrant.patent_id}`}
                    state={{ from: grantBackPath }}
                    className={valueLink}
                  >
                    {ridName || 'Карточка РИД'}
                  </Link>
                ) : (
                  <span className={styles.infoValueMuted}>Не указан</span>
                )}
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Рег. номер РИД</span>
                <span className={ridRegNumber ? styles.infoValue : styles.infoValueMuted}>
                  {ridRegNumber || 'Не указан'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Проект</span>
                {projectId ? (
                  <Link
                    to={`/projects/${projectId}`}
                    state={{ from: grantBackPath }}
                    className={valueLink}
                  >
                    {getNameById(projectId, referenceBooks.projects) || '—'}
                  </Link>
                ) : (
                  <span className={styles.infoValueMuted}>Не указан</span>
                )}
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Договор (доходный)</span>
                {contract?.id ? (
                  <Link
                    to={`/contracts/${contract.id}`}
                    state={{ from: grantBackPath }}
                    className={`${styles.infoValue} ${styles.registryLink}`}
                  >
                    {getContractDisplayLabel(contract) || '—'}
                  </Link>
                ) : (
                  <span className={styles.infoValueMuted}>Не указан</span>
                )}
              </div>
              {!hasActual ? (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Предполагаемый лицензиат</span>
                  <LicenseeLinks partnerIds={expectedLicenseeIds} partners={referenceBooks.partners} backPath={grantBackPath} />
                </div>
              ) : (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Фактический лицензиат</span>
                  <LicenseeLinks partnerIds={actualLicenseeIds} partners={referenceBooks.partners} backPath={grantBackPath} />
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <FileTextOutlined style={{ marginRight: 6 }} />
              Дополнительная информация
            </h3>
            <div className={styles.infoRows}>
              <div className={`${styles.infoRow} ${styles.infoRowNotes}`}>
                <span className={styles.infoLabel}>Примечания</span>
                {patentGrant.notes?.trim() ? (
                  <p className={styles.notesText}>{patentGrant.notes.trim()}</p>
                ) : (
                  <span className={styles.infoValueMuted}>Не указаны</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatentGrantMainInfoTab() {
  const patentGrant = useOutletContext<PatentGrant>();
  return <PatentGrantMainInfo patentGrant={patentGrant} />;
}
