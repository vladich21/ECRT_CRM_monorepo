import type { Rule } from 'antd/es/form';

/** Формат российского ИНН - только для автозагрузки по кнопке «Загрузить по ИНН». */
export const RUSSIAN_INN_PATTERN = /^\d{10}$|^\d{12}$/;
export const RUSSIAN_INN_PATTERN_MESSAGE = 'ИНН должен содержать 10 или 12 цифр';

/** Обязательное поле ИНН/налогового номера без ограничения формата (в т.ч. зарубежные компании). */
export const innRequiredFormRules: Rule[] = [{ required: true, message: 'Введите ИНН' }];

export const innOptionalFormRules: Rule[] = [
  {
    validator: (_rule, value) => {
      const trimmed = String(value ?? '').trim();
      if (!trimmed) return Promise.resolve();
      return RUSSIAN_INN_PATTERN.test(trimmed)
        ? Promise.resolve()
        : Promise.reject(new Error(RUSSIAN_INN_PATTERN_MESSAGE));
    },
  },
];
