import React, { useState } from 'react';
import { Gantt, ILink, ITask, Willow } from '@svar-ui/react-gantt';

import '@svar-ui/react-gantt/all.css';

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';

const { Title, Text } = Typography;

const initialTasks: ITask[] = [
  // Проект 1: Разработка веб-приложения
  {
    id: 'project-1',
    text: '🎯 Веб-приложение для CRM',
    start: new Date(2024, 5, 1),
    end: new Date(2024, 7, 31),
    progress: 35,
    type: 'project',
    isDisabled: false,
    styles: {
      backgroundColor: '#1890ff',
      backgroundSelectedColor: '#40a9ff',
      progressColor: '#52c41a',
      progressSelectedColor: '#73d13d',
    },
  },
  {
    id: 'task-1-1',
    text: 'Анализ требований',
    start: new Date(2024, 5, 1),
    end: new Date(2024, 5, 10),
    progress: 100,
    type: 'task',
    parent: 'project-1', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#13c2c2',
      progressColor: '#36cfc9',
    },
  },
  {
    id: 'task-1-2',
    text: 'Дизайн интерфейса',
    start: new Date(2024, 5, 5),
    end: new Date(2024, 5, 20),
    progress: 80,
    type: 'task',
    parent: 'project-1', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#722ed1',
      progressColor: '#9254de',
    },
  },
  {
    id: 'task-1-3',
    text: 'Разработка фронтенда',
    start: new Date(2024, 5, 15),
    end: new Date(2024, 6, 15),
    progress: 60,
    type: 'task',
    parent: 'project-1', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#fa8c16',
      progressColor: '#ffa940',
    },
  },
  {
    id: 'task-1-4',
    text: 'Разработка бэкенда',
    start: new Date(2024, 5, 20),
    end: new Date(2024, 6, 25),
    progress: 45,
    type: 'task',
    parent: 'project-1', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#f5222d',
      progressColor: '#ff4d4f',
    },
  },
  {
    id: 'milestone-1',
    text: '🚀 MVP готово',
    start: new Date(2024, 6, 30),
    progress: 0,
    type: 'milestone',
    parent: 'project-1', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#faad14',
      backgroundSelectedColor: '#ffc53d',
    },
  },

  // Проект 2: Мобильное приложение
  {
    id: 'project-2',
    text: '📱 Мобильное приложение',
    start: new Date(2024, 6, 1),
    end: new Date(2024, 8, 30),
    progress: 15,
    type: 'project',
    isDisabled: false,
    styles: {
      backgroundColor: '#52c41a',
      backgroundSelectedColor: '#73d13d',
    },
  },
  {
    id: 'task-2-1',
    text: 'Прототипирование',
    start: new Date(2024, 6, 1),
    end: new Date(2024, 6, 15),
    progress: 100,
    type: 'task',
    parent: 'project-2', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#1890ff',
      progressColor: '#40a9ff',
    },
  },
  {
    id: 'task-2-2',
    text: 'iOS разработка',
    start: new Date(2024, 6, 10),
    end: new Date(2024, 8, 10),
    progress: 30,
    type: 'task',
    parent: 'project-2', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#eb2f96',
      progressColor: '#f759ab',
    },
  },
  {
    id: 'task-2-3',
    text: 'Android разработка',
    start: new Date(2024, 6, 10),
    end: new Date(2024, 8, 20),
    progress: 25,
    type: 'task',
    parent: 'project-2', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#722ed1',
      progressColor: '#9254de',
    },
  },
  {
    id: 'task-2-4',
    text: 'Тестирование',
    start: new Date(2024, 8, 15),
    end: new Date(2024, 8, 30),
    progress: 5,
    type: 'task',
    parent: 'project-2', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#fa8c16',
      progressColor: '#ffa940',
    },
  },

  // Проект 3: Интеграция систем
  {
    id: 'project-3',
    text: '🔄 Интеграция с ERP',
    start: new Date(2024, 5, 15),
    end: new Date(2024, 7, 15),
    progress: 70,
    type: 'project',
    isDisabled: false,
    styles: {
      backgroundColor: '#722ed1',
      backgroundSelectedColor: '#9254de',
    },
  },
  {
    id: 'task-3-1',
    text: 'API проектирование',
    start: new Date(2024, 5, 15),
    end: new Date(2024, 5, 30),
    progress: 100,
    type: 'task',
    parent: 'project-3', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#13c2c2',
      progressColor: '#36cfc9',
    },
  },
  {
    id: 'task-3-2',
    text: 'Разработка интеграции',
    start: new Date(2024, 5, 25),
    end: new Date(2024, 6, 30),
    progress: 85,
    type: 'task',
    parent: 'project-3', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#fa8c16',
      progressColor: '#ffa940',
    },
  },
  {
    id: 'milestone-2',
    text: '✅ Интеграция завершена',
    start: new Date(2024, 7, 15),
    progress: 0,
    type: 'milestone',
    parent: 'project-3', // ← Используем parent вместо project
    styles: {
      backgroundColor: '#52c41a',
      backgroundSelectedColor: '#73d13d',
    },
  },
];

// Создаем связи между задачами
const initialILinks: ILink[] = [
  // Связи для проекта 1
  { id: 'link-1-1-2', source: 'task-1-1', target: 'task-1-2', type: 'e2s' },
  { id: 'link-1-2-3', source: 'task-1-2', target: 'task-1-3', type: 'e2s' },
  { id: 'link-1-1-4', source: 'task-1-1', target: 'task-1-4', type: 'e2s' },
  { id: 'link-1-3-m1', source: 'task-1-3', target: 'milestone-1', type: 'e2s' },
  { id: 'link-1-4-m1', source: 'task-1-4', target: 'milestone-1', type: 'e2s' },

  // Связи для проекта 2
  { id: 'link-2-1-2', source: 'task-2-1', target: 'task-2-2', type: 'e2s' },
  { id: 'link-2-1-3', source: 'task-2-1', target: 'task-2-3', type: 'e2s' },
  { id: 'link-2-2-4', source: 'task-2-2', target: 'task-2-4', type: 'e2s' },
  { id: 'link-2-3-4', source: 'task-2-3', target: 'task-2-4', type: 'e2s' },

  // Связи для проекта 3
  { id: 'link-3-1-2', source: 'task-3-1', target: 'task-3-2', type: 'e2s' },
  { id: 'link-3-2-m2', source: 'task-3-2', target: 'milestone-2', type: 'e2s' },

  // Межпроектные зависимости
  { id: 'link-1-3-3-2', source: 'task-1-3', target: 'task-3-2', type: 'e2s' },
  { id: 'link-m1-2-2', source: 'milestone-1', target: 'task-2-2', type: 'e2s' },
];

export const GanttField = () => {
  const [tasks, setTasks] = useState<ITask[]>(initialTasks);
  const [links, setILinks] = useState<ILink[]>(initialILinks);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);

  // Обработчики событий
  const handleTaskSelect = (task: ITask) => {
    setSelectedTask(task);
    console.log('Selected task:', task);
  };

  const handleTaskUpdate = (updatedTask: ITask) => {
    setTasks(tasks.map(task => (task.id === updatedTask.id ? updatedTask : task)));
  };

  return (
    <Willow>
      <Gantt
        tasks={tasks}
        links={links}
        onTaskSelect={handleTaskSelect}
        onTaskUpdate={handleTaskUpdate}
        onILinkCreate={(link: ILink) => {
          setILinks([...links, link]);
        }}
        onILinkDelete={(link: ILink) => {
          setILinks(links.filter(l => l.id !== link.id));
        }}
        zoom
      />
    </Willow>
  );
};
