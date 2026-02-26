import { Row, Col, Image, Button, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLogin } from '../../api/auth/useLogin';
import { useNotification } from '../../customhooks/useNotification';
import { authLoadingScreenStore } from '../../store/authLoadingScreenStore';

function LoginPage() {
  const { contextHolder, showNotification } = useNotification();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { mutate, isPending } = useLogin();
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  const handelSubmit = (creditals: { login: string; pass: string }) => {
    authLoadingScreenStore.clearTimers();
    
    mutate(creditals, {
      onSuccess: () => {
        setShowLoadingScreen(true);
        authLoadingScreenStore.show();
        
        authLoadingScreenStore.setNavigateTimer(() => {
          navigate('/home');
        }, 1000);
        
        authLoadingScreenStore.setHideTimer(() => {
          setShowLoadingScreen(false);
          authLoadingScreenStore.hide();
        }, 2000);
      },
      onError: (error) => {
        setShowLoadingScreen(false);
        authLoadingScreenStore.clearTimers();
        authLoadingScreenStore.hide();
        showNotification('error', 'Ошибка входа', 'Неверные учетные данные' );
      }
    });
  };

  return (
    <>
      {contextHolder}
      {!showLoadingScreen && (
        <Row justify='center' align='middle' style={{ minHeight: '100vh' }}>
        <Col>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Image src='/logo.png' alt='Логотип' preview={false} width={200} />
          </div>

          <Form form={form} onFinish={handelSubmit} layout='vertical' initialValues={{ remember: true }}>
            <Form.Item
              label='Имя пользователя'
              name='login'
              rules={[
                { required: true, message: 'Пожалуйста, введите login' },
                { type: 'string', message: 'Введите корректный login' },
              ]}
            >
              <Input placeholder='Ваш login' size='large' />
            </Form.Item>

            <Form.Item
              label='Пароль'
              name='pass'
              rules={[
                { required: true, message: 'Пожалуйста, введите пароль' },
                { min: 3, message: 'Минимум 3 символа' },
              ]}
            >
              <Input.Password placeholder='Ваш пароль' size='large' />
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' size='large' loading={isPending} disabled={isPending} block>
                {isPending ? 'Вход...' : 'Войти'}
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>
      )}
    </>
  );
}

export default LoginPage;
