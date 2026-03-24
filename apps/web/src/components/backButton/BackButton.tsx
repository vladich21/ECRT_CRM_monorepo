import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const BackButton = ({ path, onClick }: { path?: string; onClick?: () => void }) => {
  const navigate = useNavigate();
  return (
    <Button
      type='text'
      icon={<ArrowLeftOutlined />}
      onClick={onClick || (() => (path ? navigate(path) : navigate(-1)))}
      style={{ marginBottom: 8 }}
    >
      Назад
    </Button>
  );
};
