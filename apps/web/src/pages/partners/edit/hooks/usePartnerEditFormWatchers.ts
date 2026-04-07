import { Form } from 'antd';
import type { FormInstance } from 'antd';

export function usePartnerEditFormWatchers(form: FormInstance) {
  return {
    name: Form.useWatch('name', form) as string | undefined,
    short_name: Form.useWatch('short_name', form) as string | undefined,
    inn: Form.useWatch('inn', form) as string | undefined,
    type_ids: Form.useWatch('type_ids', form) as string[] | undefined,
    actual_address: Form.useWatch('actual_address', form) as string | undefined,
    is_key_supplier: Form.useWatch('is_key_supplier', form) as boolean | undefined,
    is_targeted: Form.useWatch('is_targeted', form) as boolean | undefined,
    category_id: Form.useWatch('category_id', form) as string | undefined,
  };
}
