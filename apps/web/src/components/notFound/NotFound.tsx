import { Button, Card } from 'antd';
import { useNavigate } from 'react-router-dom';

export const NotFound = ({ errorMessage }: { errorMessage: string }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>{errorMessage}</h2>
        <Button type='primary' onClick={() => navigate(-1)}>
          Вернуться назад
        </Button>
      </div>
    </Card>
  );
};
