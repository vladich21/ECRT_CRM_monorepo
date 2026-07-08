export type ScoreGuideStep = {
  score: number;
  label: string;
  description: string;
};

/** Общая шкала баллов (1–5) для подсказок в отчёте и формах. */
export const SUPPLIER_EVALUATION_SCORE_GUIDE: ScoreGuideStep[] = [
  {
    score: 1,
    label: '1',
    description: 'Критическое несоответствие требованиям; необходимы срочные корректирующие действия.',
  },
  {
    score: 2,
    label: '2',
    description: 'Существенные замечания и несоответствия; требуется план мер и комментарий закупщика.',
  },
  {
    score: 3,
    label: '3',
    description: 'В целом удовлетворительно, отдельные замечания не блокируют сотрудничество.',
  },
  {
    score: 4,
    label: '4',
    description: 'Соответствует требованиям с незначительными отклонениями.',
  },
  {
    score: 5,
    label: '5',
    description: 'Полное соответствие требованиям, образцовое выполнение обязательств.',
  },
];
