import dayjs from 'dayjs';

import { Contract } from '../../types/contract';

export const contractUpdateFormMapper = (contractData: Contract) => {
  const values = {
    name: contractData.name || '',
    number: contractData.number || '',
    cipher: contractData.cipher || '',
    date_signed: contractData.date_signed ? dayjs(contractData.date_signed) : null,
    partner_id: contractData.partner_id || null,
    description: contractData.description || '',
    start_date: contractData.start_date ? dayjs(contractData.start_date) : null,
    end_date: contractData.end_date ? dayjs(contractData.end_date) : null,
    amount_excl_vat: contractData.amount_excl_vat || 0,
    vat_rate: contractData.vat_rate || 0,
    amount_vat: contractData.amount_vat || 0,
    amount_incl_vat: contractData.amount_incl_vat || 0,
    category_id: contractData.category_id || null,
    contract_type_id: contractData.contract_type_id || null,
    responsible_id: contractData.responsible_id || null,
    supplier_manager_id: contractData.supplier_manager_id ?? null,
    project_id: contractData.project_id || null,
    state_id: contractData.state_id || null,
    plan_in_gantt: contractData.plan_in_gantt ?? true,
  };
  return values;
};
