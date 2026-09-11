import { describe, expect, it } from 'vitest';

import {
  formatIncomeLinkSnapshot,
  formatLeadSnapshot,
  formatPriceSnapshot,
  formatPurchaseMethodSnapshot,
  formatQuoteSnapshot,
  formatRouteDocumentSnapshot,
  formatSelectionSnapshot,
  formatSupplierSnapshot,
  purchaseRequestJournalActionLabel,
} from './purchaseRequestLabels';
import { canChangePurchaseRequestIncomeLink } from './purchaseRequestPolicy';

describe('purchaseRequestJournal labels', () => {
  it('names known actions', () => {
    expect(purchaseRequestJournalActionLabel('income_link_changed')).toBe('Смена доходного договора');
    expect(purchaseRequestJournalActionLabel('created')).toBe('Создан запрос');
    expect(purchaseRequestJournalActionLabel('lead_assigned')).toBe('Назначен ведущий ОУП');
    expect(purchaseRequestJournalActionLabel('supplier_added')).toBe('Добавлен поставщик');
    expect(purchaseRequestJournalActionLabel('quote_added')).toBe('Добавлено КП');
    expect(purchaseRequestJournalActionLabel('quote_updated')).toBe('Изменено КП');
    expect(purchaseRequestJournalActionLabel('price_fixed')).toBe('Зафиксирована НМЦД');
    expect(purchaseRequestJournalActionLabel('supplier_selected')).toBe('Выбран поставщик');
    expect(purchaseRequestJournalActionLabel('agreement_started')).toBe('Отправлен на согласование');
    expect(purchaseRequestJournalActionLabel('method_selected')).toBe('Выбран способ закупки');
    expect(purchaseRequestJournalActionLabel('route_started')).toBe('Оформлен договор');
  });

  it('prints contract and stage from the snapshot', () => {
    expect(
      formatIncomeLinkSnapshot({
        income_contract_id: 'c1',
        income_stage_id: 's1',
        income_contract_name: 'ДВ-12',
        income_stage_name: 'Этап 1. Поставка',
      }),
    ).toBe('ДВ-12 · Этап 1. Поставка');
    expect(
      formatIncomeLinkSnapshot({
        income_contract_id: null,
        income_stage_id: null,
        income_contract_name: null,
        income_stage_name: null,
      }),
    ).toBe('Не указан');
  });

  it('prints assigned lead from the snapshot', () => {
    expect(
      formatLeadSnapshot({
        lead_manager_id: 'u1',
        lead_manager_name: 'Иванов Иван',
      }),
    ).toBe('Иванов Иван');
    expect(
      formatLeadSnapshot({
        lead_manager_id: null,
        lead_manager_name: null,
      }),
    ).toBe('Не назначен');
  });

  it('prints added supplier from the snapshot', () => {
    expect(
      formatSupplierSnapshot({
        partner_id: 'p1',
        partner_name: 'ООО Ромашка',
      }),
    ).toBe('ООО Ромашка');
  });

  it('prints added quote from the snapshot', () => {
    expect(
      formatQuoteSnapshot({
        quote_id: 'q1',
        partner_id: 'p1',
        partner_name: 'ООО Ромашка',
        price: '120000.00',
      }),
    ).toBe('ООО Ромашка · 120000.00');
  });

  it('prints NMCD and selected supplier from their snapshots', () => {
    expect(
      formatPriceSnapshot({
        method: 'market',
        amount: '100000.00',
        excluded_count: 1,
      }),
    ).toBe('Рыночный · 100000.00 · выбросов: 1');
    expect(
      formatSelectionSnapshot({
        quote_id: 'q1',
        partner_id: 'p1',
        partner_name: 'ООО Ромашка',
        reason_codes: ['lowest_price'],
      }),
    ).toBe('ООО Ромашка');
    expect(
      formatPurchaseMethodSnapshot({
        method_id: 'm1',
        method_code: 'small',
        method_name: 'До 100 тыс. ₽',
        in_threshold: true,
      }),
    ).toBe('До 100 тыс. ₽');
    expect(
      formatRouteDocumentSnapshot({
        kind: 'contract',
        contract_id: 'c1',
        contract_name: 'Поставка насосов',
      }),
    ).toBe('Поставка насосов');
  });

  it('does not treat a price snapshot as a quote', () => {
    expect(
      formatQuoteSnapshot({
        method: 'market',
        amount: '100000.00',
        excluded_count: 0,
      }),
    ).toBe('—');
  });
});

describe('canChangePurchaseRequestIncomeLink', () => {
  const base = {
    funding_source: 'income_contract',
    initiator_id: 'a',
    lead_manager_id: null as string | null,
    status: 'draft',
  };

  it('allows the initiator and assigned lead', () => {
    expect(canChangePurchaseRequestIncomeLink(base, 'a')).toBe(true);
    expect(canChangePurchaseRequestIncomeLink({ ...base, lead_manager_id: 'lead' }, 'lead')).toBe(true);
    expect(canChangePurchaseRequestIncomeLink(base, 'other')).toBe(false);
  });

  it('hides the action unless source is income_contract', () => {
    expect(canChangePurchaseRequestIncomeLink({ ...base, funding_source: 'budget' }, 'a')).toBe(false);
  });
});
