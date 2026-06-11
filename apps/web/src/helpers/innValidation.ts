import type { Rule } from 'antd/es/form';

export const INN_PATTERN = /^\d{10}$|^\d{12}$/;
export const INN_PATTERN_MESSAGE = 'ИНН должен содержать 10 или 12 цифр';

export const innRequiredFormRules: Rule[] = [
  { required: true, message: 'Введите ИНН' },
  { pattern: INN_PATTERN, message: INN_PATTERN_MESSAGE },
];

export const innOptionalFormRules: Rule[] = [
  {
    validator: (_rule, value) => {
      const trimmed = String(value ?? '').trim();
      if (!trimmed) return Promise.resolve();
      return INN_PATTERN.test(trimmed) ? Promise.resolve() : Promise.reject(new Error(INN_PATTERN_MESSAGE));
    },
  },
];
