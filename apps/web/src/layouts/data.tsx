import {
  AuditOutlined,
  CopyrightOutlined,
  HomeOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Link } from 'react-router-dom';

import { SECTIONS, type SectionCode } from '../shared/permissions';

type MenuItem = NonNullable<MenuProps['items']>[number];

interface RawMenuItem {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  label: any;
  /** Если задан — пункт показывается только если есть read-доступ хотя бы к одному из разделов */
  requiredSections?: ReadonlyArray<SectionCode | string>;
  children?: RawMenuItem[];
}

/**
 * Все пункты меню с привязкой к разделам прав.
 * Корневые пункты без `requiredSections` показываются всегда (например, «Главная»).
 * Группы автоматически скрываются, если все их дочерние пункты недоступны.
 */
const RAW_MENU: RawMenuItem[] = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: <Link to='/'>Главная</Link>,
  },
  {
    key: 'my-approvals',
    icon: <AuditOutlined />,
    label: <Link to='/my-approvals'>Мои согласования</Link>,
  },
  {
    key: 'supply_management',
    icon: <TruckOutlined />,
    label: 'Закупки',
    children: [
      {
        key: 'partners',
        label: <Link to='/partners'>Контрагенты</Link>,
        requiredSections: [SECTIONS.PARTNERS_LIST],
      },
      {
        key: 'contracts',
        label: <Link to='/contracts'>Договоры</Link>,
        requiredSections: [SECTIONS.CONTRACTS_LIST],
      },
      {
        key: 'supplier_evaluations',
        label: <Link to='/supplier-evaluations'>Реестр оценок</Link>,
        requiredSections: [SECTIONS.PARTNERS_EVALUATIONS],
      },
      {
        key: 'supply_references',
        label: 'Справочники',
        children: [
          {
            key: 'partnerTypes',
            label: <Link to='/admin/partner-types'>Типы контрагентов</Link>,
            requiredSections: [SECTIONS.REFERENCES_PARTNER_TYPES],
          },
          {
            key: 'partnerStatuses',
            label: <Link to='/admin/partner-statuses'>Статусы контрагентов</Link>,
            requiredSections: [SECTIONS.REFERENCES_PARTNER_STATUSES],
          },
          {
            key: 'partnerEconomicCategories',
            label: <Link to='/admin/partner-economic-categories'>Экономические категории</Link>,
            requiredSections: [SECTIONS.REFERENCES_PARTNER_ECONOMIC],
          },
          {
            key: 'contractTypes',
            label: <Link to='/admin/contract-types'>Типы договора</Link>,
            requiredSections: [SECTIONS.REFERENCES_CONTRACT_TYPES],
          },
          {
            key: 'competencies',
            label: <Link to='/competencies'>Компетенции</Link>,
            requiredSections: [SECTIONS.REFERENCES_COMPETENCIES],
          },
        ],
      },
    ],
  },
  {
    key: 'projects_management',
    label: 'Управление проектами',
    icon: <ProjectOutlined />,
    children: [
      {
        key: 'projects',
        label: <Link to='/projects'>Проекты</Link>,
        requiredSections: [SECTIONS.PROJECTS_LIST],
      },
      {
        key: 'gantts',
        label: <Link to='/gantts'>Диаграмма ганта</Link>,
        requiredSections: [SECTIONS.PROJECTS_GANTT],
      },
    ],
  },
  {
    key: 'patents_management',
    icon: <CopyrightOutlined />,
    label: 'Интеллектуальная собственность',
    children: [
      {
        key: 'patents',
        label: <Link to='/patents'>РИД</Link>,
        requiredSections: [SECTIONS.PATENTS_LIST],
      },
      {
        key: 'patent_grants',
        label: <Link to='/patent-grants'>Охранные документы</Link>,
        requiredSections: [SECTIONS.PATENTS_GRANTS],
      },
      {
        key: 'patent_references',
        label: 'Справочники',
        children: [
          {
            key: 'patentAreas',
            label: <Link to='/patent-areas'>Области патентных заявок</Link>,
            requiredSections: [SECTIONS.REFERENCES_PATENT_AREAS],
          },
        ],
      },
    ],
  },
  {
    key: 'admin',
    icon: <SafetyCertificateOutlined />,
    label: 'Администрирование',
    children: [
      {
        key: 'users',
        label: <Link to='/users'>Пользователи</Link>,
        requiredSections: [SECTIONS.ADMIN_USERS],
      },
      {
        key: 'roles_admin',
        label: <Link to='/admin/roles'>Роли и права</Link>,
        requiredSections: [SECTIONS.ADMIN_ROLES],
      },
      {
        key: 'approval_routes',
        label: <Link to='/admin/approval-routes'>Маршруты согласования</Link>,
        requiredSections: [SECTIONS.ADMIN_APPROVAL_ROUTES],
      },
      {
        key: 'department',
        label: <Link to='/departments'>Отделы</Link>,
        requiredSections: [SECTIONS.REFERENCES_DEPARTMENTS],
      },
      {
        key: 'position',
        label: <Link to='/positions'>Должности</Link>,
        requiredSections: [SECTIONS.REFERENCES_POSITIONS],
      },
    ],
  },
];

/**
 * Возвращает меню с учетом прав пользователя.
 * Скрывает пункты без read-доступа и пустые группы.
 */
export function buildMenuItems(
  hasReadAccess: (sections: ReadonlyArray<SectionCode | string>) => boolean,
): MenuItem[] {
  const filterNodes = (nodes: RawMenuItem[]): RawMenuItem[] => {
    const out: RawMenuItem[] = [];
    for (const node of nodes) {
      const cleanedChildren = node.children ? filterNodes(node.children) : undefined;
      // Папка без видимых детей — скрываем
      if (cleanedChildren && cleanedChildren.length === 0) continue;
      // Лист без прав — скрываем
      if (!cleanedChildren && node.requiredSections && !hasReadAccess(node.requiredSections)) continue;
      out.push({ ...node, children: cleanedChildren });
    }
    return out;
  };

  // Sanitize: убираем requiredSections из объектов, оставляем только Antd-поля.
  const sanitize = (nodes: RawMenuItem[]): MenuItem[] =>
    nodes.map((node) => {
      const { requiredSections: _ignored, children, ...rest } = node as RawMenuItem & {
        children?: RawMenuItem[];
      };
      void _ignored;
      if (children && children.length) {
        return { ...rest, children: sanitize(children) } as MenuItem;
      }
      return rest as MenuItem;
    });

  return sanitize(filterNodes(RAW_MENU));
}
