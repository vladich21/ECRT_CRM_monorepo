import { Form } from 'antd';
import type { FormInstance } from 'antd';

export function useContractEditFormWatchers(form: FormInstance) {
  return {
    number: Form.useWatch('number', form),
    cipher: Form.useWatch('cipher', form),
    name: Form.useWatch('name', form),
    category_id: Form.useWatch('category_id', form),
    contract_type_id: Form.useWatch('contract_type_id', form),
    state_id: Form.useWatch('state_id', form),
    partner_id: Form.useWatch('partner_id', form),
    project_id: Form.useWatch('project_id', form),
    date_signed: Form.useWatch('date_signed', form),
    end_date: Form.useWatch('end_date', form),
  };
}
