import { Flex, Button, Result } from "antd";

import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <>
      <Result
        status='404'
        title='404'
        subTitle='Страница не найдна.'
        extra={
          <>
            <Button
              onClick={() => {
                navigate(-1);
              }}
              type='primary'
            >
              Назад
            </Button>
            <Button
              onClick={() => {
                navigate("/");
              }}
              type='primary'
            >
              На главную
            </Button>
          </>
        }
      />
    </>
  );
}

export default NotFound;
