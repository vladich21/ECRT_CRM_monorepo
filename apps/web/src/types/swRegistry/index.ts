/* Типы реестра ПО по доменам. Реэкспорт здесь — чтобы не править сорок импортов
   и чтобы `@/types/swRegistry` оставался одной понятной точкой входа: типы
   стираются при сборке, на размер бандла это не влияет. */

export type * from './common';
export type * from './structure';
export type * from './items';
export type * from './documents';
export type * from './summary';
export type * from './files';
export type * from './firmwares';
