import { useCallback, useMemo } from 'react';
import { UserOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';

import type { PurchaseRequestDetail } from '@/api/procurement/requests/procurementRequestApi';
import {
  usePurchaseRequestQuotes,
  usePurchaseRequestSuppliers,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import { CanAccess } from '@/components/canAccess/CanAccess';
import { formatMoneyAmount } from '@/helpers/numberFormatters';
import { SECTIONS } from '@/shared/permissions';

import { PurchaseRequestComparison } from './PurchaseRequestComparison';
import styles from './PurchaseRequestElaboration.module.scss';
import { priceMethodLabel } from './purchaseRequestLabels';
import { PurchaseRequestQuotes } from './PurchaseRequestQuotes';
import { PurchaseRequestSuppliers } from './PurchaseRequestSuppliers';

const PANE_LEAD = 'lead';
const PANE_SUPPLIERS = 'suppliers';
const PANE_QUOTES = 'quotes';
const PANE_DECISION = 'decision';
const SECTION_PARAM = 'section';
const TAB_PARAM = 'tab';
const ELABORATION_TAB = 'elaboration';

const PANES = [PANE_LEAD, PANE_SUPPLIERS, PANE_QUOTES, PANE_DECISION] as const;
type Pane = (typeof PANES)[number];

type Props = {
  request: PurchaseRequestDetail;
  canAssign: boolean;
  canEdit: boolean;
  onAssign: () => void;
};

type FlowStep = {
  pane: Exclude<Pane, typeof PANE_LEAD>;
  title: string;
  /** Несколько строк: НМЦД и выбранный поставщик не слипаются в одну. */
  detail: string[];
  done: boolean;
};

function parsePane(raw: string | null): Pane {
  if (raw && (PANES as readonly string[]).includes(raw)) return raw as Pane;
  return PANE_LEAD;
}

export function PurchaseRequestElaboration({ request, canAssign, canEdit, onAssign }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pane = parsePane(searchParams.get(SECTION_PARAM));

  const setPane = useCallback(
    (next: Pane) => {
      setSearchParams(
        prev => {
          const nextParams = new URLSearchParams(prev);
          nextParams.set(TAB_PARAM, ELABORATION_TAB);
          if (next === PANE_LEAD) nextParams.delete(SECTION_PARAM);
          else nextParams.set(SECTION_PARAM, next);
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const { data: suppliers = [] } = usePurchaseRequestSuppliers(request.id);
  const { data: quotes = [] } = usePurchaseRequestQuotes(request.id);

  const selectedQuote = quotes.find(quote => quote.id === request.selected_quote_id);
  const nmcdDone = Boolean(request.price_method);
  const selectDone = Boolean(request.selected_quote_id);
  const decisionDone = nmcdDone && selectDone;

  const flow: FlowStep[] = useMemo(() => {
    const nmcdText = nmcdDone
      ? [
          priceMethodLabel(request.price_method),
          request.initial_max_price ? formatMoneyAmount(request.initial_max_price, request.currency_code) : null,
        ]
          .filter(Boolean)
          .join(', ')
      : 'Не зафиксирована';
    const selectText = selectDone
      ? `Выбран: ${selectedQuote?.partner_name?.trim() || 'поставщик'}`
      : 'Поставщик не выбран';

    return [
      {
        pane: PANE_SUPPLIERS,
        title: 'Поставщики',
        done: suppliers.length > 0,
        detail: [suppliers.length > 0 ? String(suppliers.length) : 'Не добавлены'],
      },
      {
        pane: PANE_QUOTES,
        title: 'Коммерческие предложения',
        done: quotes.length > 0,
        detail: [
          quotes.length > 0
            ? suppliers.length
              ? `${quotes.length} из ${suppliers.length}`
              : String(quotes.length)
            : 'Пока нет',
        ],
      },
      {
        pane: PANE_DECISION,
        title: 'НМЦД и выбор',
        done: decisionDone,
        detail: [nmcdText, selectText],
      },
    ];
  }, [
    decisionDone,
    nmcdDone,
    quotes.length,
    request.currency_code,
    request.initial_max_price,
    request.price_method,
    selectDone,
    selectedQuote?.partner_name,
    suppliers.length,
  ]);

  const currentPane = flow.find(step => !step.done)?.pane;

  const tabs: { key: Pane; label: string; count?: number }[] = [
    { key: PANE_LEAD, label: 'Ведущий' },
    { key: PANE_SUPPLIERS, label: 'Поставщики', count: suppliers.length },
    { key: PANE_QUOTES, label: 'Коммерческие предложения', count: quotes.length },
    { key: PANE_DECISION, label: 'НМЦД и выбор' },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.filterTabs} role='tablist' aria-label='Разделы проработки'>
        {tabs.map(tab => (
          <button
            key={tab.key}
            type='button'
            role='tab'
            aria-selected={pane === tab.key}
            className={`${styles.filterTab} ${pane === tab.key ? styles.filterTabActive : ''}`}
            onClick={() => setPane(tab.key)}
          >
            {tab.label}
            {tab.count != null ? <span className={styles.filterTabCount}>{tab.count}</span> : null}
          </button>
        ))}
      </div>
      <div className={styles.pane}>
        {pane === PANE_LEAD ? (
          <LeadPane
            request={request}
            canAssign={canAssign}
            flow={flow}
            currentPane={currentPane}
            onAssign={onAssign}
            onOpen={setPane}
          />
        ) : null}
        {pane === PANE_SUPPLIERS ? <PurchaseRequestSuppliers request={request} canEdit={canEdit} /> : null}
        {pane === PANE_QUOTES ? (
          <div className={styles.quotesPane}>
            <PurchaseRequestQuotes request={request} canEdit={canEdit} />
            <PurchaseRequestComparison request={request} canEdit={canEdit} pane='compare' />
          </div>
        ) : null}
        {pane === PANE_DECISION ? (
          <PurchaseRequestComparison request={request} canEdit={canEdit} pane='decision' />
        ) : null}
      </div>
    </div>
  );
}

function LeadPane({
  request,
  canAssign,
  flow,
  currentPane,
  onAssign,
  onOpen,
}: {
  request: PurchaseRequestDetail;
  canAssign: boolean;
  flow: FlowStep[];
  currentPane: Exclude<Pane, typeof PANE_LEAD> | undefined;
  onAssign: () => void;
  onOpen: (pane: Pane) => void;
}) {
  const assigned = Boolean(request.lead_manager_id);
  const assignButton = canAssign ? (
    <CanAccess section={SECTIONS.PROCUREMENT_LEAD} action='edit'>
      <Button type={assigned ? 'default' : 'primary'} onClick={onAssign}>
        {assigned ? 'Сменить' : 'Назначить'}
      </Button>
    </CanAccess>
  ) : null;

  return (
    <div className={styles.leadLayout}>
      <section className={styles.leadCard} aria-label='Ведущий ОУП'>
        <div className={styles.leadIcon} aria-hidden>
          <UserOutlined />
        </div>
        <div className={styles.leadBody}>
          <p className={styles.leadRole}>Ответственный за проработку</p>
          {assigned ? (
            <p className={styles.leadName}>{request.lead_manager_name?.trim() || 'Сотрудник'}</p>
          ) : (
            <p className={`${styles.leadName} ${styles.muted}`}>Не назначен</p>
          )}
          {!assigned ? (
            <Typography.Text type='secondary' className={styles.hint}>
              До назначения ведущего ОУП проработку вести нельзя.
            </Typography.Text>
          ) : null}
        </div>
        {assignButton}
      </section>

      {assigned ? (
        <section className={styles.progress} aria-label='Ход проработки'>
          <h3 className={styles.progressTitle}>Ход проработки</h3>
          <ol className={styles.flow}>
            {flow.map((step, index) => {
              const current = !step.done && step.pane === currentPane;
              return (
                <li key={step.pane} className={styles.flowNode}>
                  {index > 0 ? (
                    <span
                      className={`${styles.flowLine} ${flow[index - 1].done ? styles.flowLineDone : ''}`}
                      aria-hidden
                    />
                  ) : null}
                  <div className={styles.flowStep}>
                    <span
                      className={`${styles.flowDot} ${step.done ? styles.flowDotDone : ''} ${current ? styles.flowDotCurrent : ''}`}
                    >
                      {step.done ? '✓' : index + 1}
                    </span>
                    <button type='button' className={styles.flowTitleLink} onClick={() => onOpen(step.pane)}>
                      {step.title}
                    </button>
                    <span className={styles.flowDetail}>
                      {step.detail.map(line => (
                        <span key={line} className={styles.flowDetailLine}>
                          {line}
                        </span>
                      ))}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
