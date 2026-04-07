import type { NamePath } from 'antd/es/form/interface';

export type PartnerCreateFormFieldError = { name: NamePath; errors: string[] };

export type PartnerCreateApiErrorFormPatch = {
  errorFieldNames: string[];
  fieldData: PartnerCreateFormFieldError[];
};

export function mapPartnerCreateApiErrorToForm(message: string): PartnerCreateApiErrorFormPatch | null {
  const isInnKppDuplicate = message.includes('ИНН и КПП');
  const isInnRequired = message.includes('ИНН обязателен');
  const isKppRequired = message.includes('КПП обязателен');
  if (isInnKppDuplicate) {
    const err = 'Контрагент с такой комбинацией ИНН и КПП уже существует';
    return {
      errorFieldNames: ['inn', 'kpp'],
      fieldData: [
        { name: 'inn', errors: [err] },
        { name: 'kpp', errors: [err] },
      ],
    };
  }
  if (isInnRequired) {
    return {
      errorFieldNames: ['inn'],
      fieldData: [{ name: 'inn', errors: ['ИНН обязателен для заполнения'] }],
    };
  }
  if (isKppRequired) {
    return {
      errorFieldNames: ['kpp'],
      fieldData: [{ name: 'kpp', errors: ['КПП обязателен для заполнения'] }],
    };
  }
  return null;
}
