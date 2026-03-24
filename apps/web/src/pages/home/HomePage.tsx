import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  CopyrightOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Card, Col, List, Row, Space, Statistic, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import styles from './styles.module.scss';

const { Text } = Typography;
function HomePage() {
  const navigate = useNavigate();
  const statistics = {
    partners: { value: 156, growth: 12 },
    contracts: { value: 89, growth: -5 },
    patents: { value: 34, growth: 8 },
    projects: { value: 23, growth: 15 },
  };
  const recentActivities = [
    { id: 1, title: 'Новый договор с ООО "Поставщик"', date: '2026-01-20', label: 'Договор' },
    { id: 2, title: 'Зарегистрирован патент №123456', date: '2026-01-19', label: 'РИД' },
    { id: 3, title: 'Завершен этап проекта "Модернизация"', date: '2026-01-18', label: 'Проект' },
    { id: 4, title: 'Добавлен новый контрагент', date: '2026-01-17', label: 'Контрагент' },
  ];
  const quickLinks = [
    { title: 'Создать договор', icon: <FileTextOutlined />, path: '/contracts/create' },
    { title: 'Добавить контрагента', icon: <TeamOutlined />, path: '/partners/create' },
    { title: 'Новый РИД', icon: <CopyrightOutlined />, path: '/patents/create' },
    { title: 'Создать проект', icon: <ProjectOutlined />, path: '/projects/create' },
  ];
  const upcomingTasks = [
    { id: 1, title: 'Продление договора №45', deadline: '2026-01-25', priority: 'high', priorityLabel: 'Высокий' },
    {
      id: 2,
      title: 'Проверка документов по патенту',
      deadline: '2026-01-28',
      priority: 'medium',
      priorityLabel: 'Средний',
    },
    { id: 3, title: 'Встреча с новым поставщиком', deadline: '2026-02-01', priority: 'low', priorityLabel: 'Низкий' },
  ];
  const GrowthIndicator = ({ value }: { value: number }) => (
    <span className={styles.growth}>
      {value > 0 ? (
        <ArrowUpOutlined style={{ color: '#52c41a' }} />
      ) : (
        <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
      )}
      {Math.abs(value)}%
    </span>
  );
  return (
    <div className={styles.homePage}>
      <div className={styles.heroBanner}>
        <h1 className={styles.heroTitle}>Система управления закупками и проектами</h1>
        <p className={styles.heroSubtitle}>Добро пожаловать! Вот краткий обзор текущей ситуации.</p>
      </div>

      <div className={styles.content}>
        <Row gutter={[16, 16]} className={styles.statistics}>
          <Col xs={24} sm={12} lg={6}>
            <div className={styles.statCard}>
              <Statistic
                title='Контрагенты'
                value={statistics.partners.value}
                prefix={<TeamOutlined />}
                suffix={<GrowthIndicator value={statistics.partners.growth} />}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div className={styles.statCard}>
              <Statistic
                title='Договоры'
                value={statistics.contracts.value}
                prefix={<FileTextOutlined />}
                suffix={<GrowthIndicator value={statistics.contracts.growth} />}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div className={styles.statCard}>
              <Statistic
                title='РИД'
                value={statistics.patents.value}
                prefix={<CopyrightOutlined />}
                suffix={<GrowthIndicator value={statistics.patents.growth} />}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div className={styles.statCard}>
              <Statistic
                title='Проекты'
                value={statistics.projects.value}
                prefix={<ProjectOutlined />}
                suffix={<GrowthIndicator value={statistics.projects.growth} />}
              />
            </div>
          </Col>
        </Row>

        <Card title='Быстрые действия' className={`${styles.section} ${styles.sectionCard}`}>
          <Row gutter={[16, 16]}>
            {quickLinks.map((link, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <div className={styles.quickLinkCard} onClick={() => navigate(link.path)}>
                  <div className={styles.quickLinkIcon}>{link.icon}</div>
                  <Text strong style={{ fontSize: 14 }}>
                    {link.title}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={[16, 16]} className={styles.section}>
          <Col xs={24} lg={12}>
            <Card
              title='Последняя активность'
              className={styles.sectionCard}
              extra={<a onClick={() => navigate('/contracts')}>Посмотреть все</a>}
            >
              <List
                dataSource={recentActivities}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div className={styles.listItemTitle}>
                          <span>{item.title}</span>
                          <span className={styles.listLabel}>{item.label}</span>
                        </div>
                      }
                      description={
                        <Space size={4}>
                          <CalendarOutlined style={{ fontSize: 12 }} />
                          <Text type='secondary' style={{ fontSize: 13 }}>
                            {item.date}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title='Предстоящие задачи'
              className={styles.sectionCard}
              extra={<a onClick={() => navigate('/contracts')}>Посмотреть все</a>}
            >
              <List
                dataSource={upcomingTasks}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div className={styles.listItemTitle}>
                          <span>{item.title}</span>
                          <span className={`${styles.priorityDot} ${styles[`priority_${item.priority}`]}`} />
                        </div>
                      }
                      description={
                        <Space size={4}>
                          <CalendarOutlined style={{ fontSize: 12 }} />
                          <Text type='secondary' style={{ fontSize: 13 }}>
                            Срок: {item.deadline}
                          </Text>
                          <Text type='secondary' style={{ fontSize: 13 }}>
                            · {item.priorityLabel}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
export default HomePage;
