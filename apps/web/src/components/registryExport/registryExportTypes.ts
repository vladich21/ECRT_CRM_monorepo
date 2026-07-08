export type RegistryExportColumn<TKey extends string = string> = {
  key: TKey;
  /** Подпись в модалке выбора полей */
  label: string;
  /** Заголовок колонки в Excel; если не задан - используется label */
  exportLabel?: string;
  defaultSelected: boolean;
};

export type RegistryExportExtraSectionLayout = 'row' | 'stack' | 'split';

export type RegistryExportExtraSection<TKey extends string = string> = {
  title?: string;
  keys: TKey[];
  layout?: RegistryExportExtraSectionLayout;
};

export type RegistryExportExtraGroup<TKey extends string = string> = {
  id: string;
  title: string;
  keys?: TKey[];
  sections?: RegistryExportExtraSection<TKey>[];
  /** Колонка в блоке «Дополнительные поля»: 0 - слева, 1 - справа */
  column?: 0 | 1;
};

export type RegistryExportCellAlignment = 'left' | 'center' | 'right';

export type RegistryExportExcelStyleConfig<TKey extends string = string> = {
  numericKeys?: ReadonlySet<TKey>;
  centerKeys?: ReadonlySet<TKey>;
  moneyKeys?: ReadonlySet<TKey>;
  integerKeys?: ReadonlySet<TKey>;
  longTextKeys?: ReadonlySet<TKey>;
  /** Колонки с файлами: при нескольких файлах - отдельная строка на каждый, с объединением остальных ячеек */
  hyperlinkKeys?: ReadonlySet<TKey>;
  getAlignment?: (key: TKey) => RegistryExportCellAlignment;
  getNumericFormat?: (key: TKey) => string | undefined;
};

export type RegistryExportExcelOptions<TKey extends string = string> = RegistryExportExcelStyleConfig<TKey> & {
  sheetName: string;
  fileNamePrefix: string;
};

export type RegistryExportFileLink = {
  name: string;
  url: string;
};

export type RegistryExportHyperlinkCell = {
  links: RegistryExportFileLink[];
};

export type RegistryExportCellValue = string | RegistryExportHyperlinkCell;
