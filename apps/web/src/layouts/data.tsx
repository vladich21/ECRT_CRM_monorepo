import {
  CopyrightOutlined,
  HomeOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const menuItems = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: <Link to='/'>Главная</Link>,
  },
  {
    key: 'supply_management',
    icon: <TruckOutlined />,
    label: 'Закупки',
    children: [
      {
        key: 'partners',
        label: <Link to='/partners'>Контрагенты</Link>,
      },
      {
        key: 'contracts',
        label: <Link to='/contracts'>Договоры</Link>,
      },
      {
        key: 'supply_references',
        label: 'Справочники',
        children: [
          {
            key: 'partnerTypes',
            label: <Link to='/admin/partner-types'>Типы контрагентов</Link>,
          },
          {
            key: 'partnerStatuses',
            label: <Link to='/admin/partner-statuses'>Статусы контрагентов</Link>,
          },
          {
            key: 'partnerEconomicCategories',
            label: <Link to='/admin/partner-economic-categories'>Экономические категории</Link>,
          },
          {
            key: 'contractTypes',
            label: <Link to='/admin/contract-types'>Типы договора</Link>,
          },
          {
            key: 'competencies',
            label: <Link to='/competencies'>Компетенции</Link>,
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
      },
      {
        key: 'gantts',
        label: <Link to='/gantts'>Диаграмма ганта</Link>,
      },
    ],
  },
  {
    key: 'patents_management',
    icon: <CopyrightOutlined />,
    label: 'Интелектуальная Собственность',
    children: [
      {
        key: 'patents',
        label: <Link to='/patents'>РИД</Link>,
      },
      {
        key: 'patent_grants',
        label: <Link to='/patent-grants'>Патенты</Link>,
      },
      {
        key: 'patent_references',
        label: 'Справочники',
        children: [
          {
            key: 'patentAreas',
            label: <Link to='/patent-areas'>Области патентных заявок</Link>,
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
      },
      {
        key: 'department',
        label: <Link to='/departments'>Отделы</Link>,
      },
      {
        key: 'position',
        label: <Link to='/positions'>Должности</Link>,
      },
    ],
  },
];

export { menuItems };
