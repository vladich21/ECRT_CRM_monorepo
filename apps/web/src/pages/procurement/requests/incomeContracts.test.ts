import { describe, expect, it } from 'vitest';

import type { Contract, ContractStage, ContractType } from '@/types/contract';

import {
  incomeCreatePath,
  isIncomeContractTypeName,
  parseIncomeCreatePrefill,
  pickIncomeContracts,
  toIncomeStageSelectOptions,
  withSelectedContract,
} from './incomeContracts';

function contract(partial: Partial<Contract> & Pick<Contract, 'id'>): Contract {
  return {
    number: '',
    cipher: '',
    name: '',
    description: '',
    partner_id: '',
    project_id: '',
    responsible_id: '',
    category_id: '',
    contract_type_id: '',
    amount_excl_vat: 0,
    vat_rate: 0,
    amount_vat: 0,
    amount_incl_vat: 0,
    start_date: '',
    end_date: '',
    date_signed: '',
    state_id: '',
    is_active: true,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('incomeContracts', () => {
  it('recognizes income type names', () => {
    expect(isIncomeContractTypeName('Доходный')).toBe(true);
    expect(isIncomeContractTypeName('доходный договор')).toBe(true);
    expect(isIncomeContractTypeName('Расходный')).toBe(false);
  });

  it('falls back to all live contracts when income type is missing', () => {
    const rows = [contract({ id: 'a' }), contract({ id: 'b', is_deleted: true })];
    expect(pickIncomeContracts(rows, []).map(row => row.id)).toEqual(['a']);
  });

  it('filters by income type when the dictionary has one', () => {
    const types: ContractType[] = [
      { id: 't-in', name: 'Доходный', description: '', created_at: '', updated_at: '' },
      { id: 't-out', name: 'Расходный', description: '', created_at: '', updated_at: '' },
    ];
    const rows = [
      contract({ id: 'in', contract_type_id: 't-in' }),
      contract({ id: 'out', contract_type_id: 't-out' }),
    ];
    expect(pickIncomeContracts(rows, types).map(row => row.id)).toEqual(['in']);
  });

  it('keeps the already selected contract in the picker', () => {
    const list = [contract({ id: 'a' })];
    const extra = contract({ id: 'b', number: '42' });
    expect(withSelectedContract(list, 'b', extra).map(row => row.id)).toEqual(['b', 'a']);
  });

  it('reads ВИ-2 query params and ignores a stage without a contract', () => {
    expect(
      parseIncomeCreatePrefill(
        new URLSearchParams('incomeContractId=3fa85f64-5717-4562-b3fc-2c963f66afa6&incomeStageId=not-a-uuid'),
      ),
    ).toEqual({ contractId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });
    expect(parseIncomeCreatePrefill(new URLSearchParams('incomeStageId=3fa85f64-5717-4562-b3fc-2c963f66afa6'))).toEqual(
      {},
    );
  });

  it('builds ВИ-2 create URL', () => {
    expect(incomeCreatePath('3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBe(
      '/procurement/requests/create?incomeContractId=3fa85f64-5717-4562-b3fc-2c963f66afa6',
    );
  });

  it('keeps an archived selected stage in the picker', () => {
    const stages = [
      {
        id: 'live',
        name: 'Поставка',
        stage_number: 1,
        is_archived: false,
      },
      {
        id: 'old',
        name: 'Закрытый',
        stage_number: 2,
        is_archived: true,
      },
    ] as ContractStage[];
    expect(toIncomeStageSelectOptions(stages, 'old').map(row => row.value)).toEqual(['old', 'live']);
  });
});
