import { Card, Col, Row, Statistic, Button, List, Typography, Space, Tag } from 'antd';
import {
  ShoppingCartOutlined,
  FileTextOutlined,
  CopyrightOutlined,
  ProjectOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  TeamOutlined,
  DollarOutlined,
  RiseOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './styles.module.scss';

const { Title, Text, Paragraph } = Typography;

function HomePage() {
  const navigate = useNavigate();

  // Моковые данные для демонстрации (в будущем заменить на реальные данные из API)
  const statistics = {
    partners: { value: 156, growth: 12 },
    contracts: { value: 89, growth: -5 },
    patents: { value: 34, growth: 8 },
    projects: { value: 23, growth: 15 },
  };

  const recentActivities = [
    {
      id: 1,
      type: 'contract',
      title: 'Новый договор с ООО "Поставщик"',
      date: '2026-01-20',
      status: 'new',
    },
    {
      id: 2,
      type: 'patent',
      title: 'Зарегистрирован патент №123456',
      date: '2026-01-19',
      status: 'success',
    },
    {
      id: 3,
      type: 'project',
      title: 'Завершен этап проекта "Модернизация"',
      date: '2026-01-18',
      status: 'completed',
    },
    {
      id: 4,
      type: 'partner',
      title: 'Добавлен новый контрагент',
      date: '2026-01-17',
      status: 'new',
    },
  ];

  const quickLinks = [
    {
      title: 'Создать договор',
      icon: <FileTextOutlined />,
      path: '/contracts/create',
      color: '#1890ff',
    },
    {
      title: 'Добавить контрагента',
      icon: <TeamOutlined />,
      path: '/partners/create',
      color: '#52c41a',
    },
    {
      title: 'Новый патент',
      icon: <CopyrightOutlined />,
      path: '/patents/create',
      color: '#722ed1',
    },
    {
      title: 'Создать проект',
      icon: <ProjectOutlined />,
      path: '/projects/create',
      color: '#fa8c16',
    },
  ];

  const upcomingTasks = [
    { id: 1, title: 'Продление договора №45', deadline: '2026-01-25', priority: 'high' },
    { id: 2, title: 'Проверка документов по патенту', deadline: '2026-01-28', priority: 'medium' },
    { id: 3, title: 'Встреча с новым поставщиком', deadline: '2026-02-01', priority: 'low' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      success: 'green',
      completed: 'default',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'red',
      medium: 'orange',
      low: 'default',
    };
    return colors[priority] || 'default';
  };

  return (
    <div className={styles.homePage}>
      <div className={styles.header}>
        <Title level={2}>Система управления закупками и проектами</Title>
        <Paragraph type='secondary'>Добро пожаловать! Вот краткий обзор текущей ситуации.</Paragraph>
      </div>

      {/* Статистика */}
      <Row gutter={[16, 16]} className={styles.statistics}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Контрагенты'
              value={statistics.partners.value}
              prefix={<TeamOutlined />}
              suffix={
                <span className={styles.growth}>
                  {statistics.partners.growth > 0 ? (
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  {Math.abs(statistics.partners.growth)}%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Договоры'
              value={statistics.contracts.value}
              prefix={<FileTextOutlined />}
              suffix={
                <span className={styles.growth}>
                  {statistics.contracts.growth > 0 ? (
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  {Math.abs(statistics.contracts.growth)}%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='РИД'
              value={statistics.patents.value}
              prefix={<CopyrightOutlined />}
              suffix={
                <span className={styles.growth}>
                  {statistics.patents.growth > 0 ? (
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  {Math.abs(statistics.patents.growth)}%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Проекты'
              value={statistics.projects.value}
              prefix={<ProjectOutlined />}
              suffix={
                <span className={styles.growth}>
                  {statistics.projects.growth > 0 ? (
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  {Math.abs(statistics.projects.growth)}%
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Быстрые действия */}
      <Card title='Быстрые действия' className={styles.section}>
        <Row gutter={[16, 16]}>
          {quickLinks.map((link, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Card
                hoverable
                className={styles.quickLinkCard}
                onClick={() => navigate(link.path)}
                style={{ borderColor: link.color }}
              >
                <Space direction='vertical' align='center' style={{ width: '100%' }}>
                  <div className={styles.quickLinkIcon} style={{ color: link.color }}>
                    {link.icon}
                  </div>
                  <Text strong>{link.title}</Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} className={styles.section}>
        {/* Последняя активность */}
        <Col xs={24} lg={12}>
          <Card title='Последняя активность' extra={<a onClick={() => navigate('/contracts')}>Посмотреть все</a>}>
            <List
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        {item.title}
                        <Tag color={getStatusColor(item.status)}>
                          {item.status === 'new' && 'Новое'}
                          {item.status === 'success' && 'Успешно'}
                          {item.status === 'completed' && 'Завершено'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <CalendarOutlined />
                        {item.date}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Предстоящие задачи */}
        <Col xs={24} lg={12}>
          <Card title='Предстоящие задачи' extra={<a onClick={() => navigate('/contracts')}>Посмотреть все</a>}>
            <List
              dataSource={upcomingTasks}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        {item.title}
                        <Tag color={getPriorityColor(item.priority)}>
                          {item.priority === 'high' && 'Высокий'}
                          {item.priority === 'medium' && 'Средний'}
                          {item.priority === 'low' && 'Низкий'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <CalendarOutlined />
                        Срок: {item.deadline}
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
  );
}

export default HomePage;
