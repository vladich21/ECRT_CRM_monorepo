import { useEffect, useState } from 'react';
import { CloseOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Switch, Tag } from 'antd';
import { useForm } from 'antd/es/form/Form';
import { useNavigate, useParams } from 'react-router-dom';

import { useCreateContractRevision } from '../../api/contractRevisions/contractRevisionsApiHooks';
import { useContractById } from '../../api/contracts/contractApiHooks';
import { useContractStages } from '../../api/contractStages/contractStagesApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { BackButton } from '../../components/backButton/BackButton';
import BasicTable from '../../components/basicTable/BasicTable';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useNotification } from '@/hooks/notifications/useNotification';
import { getEntityById } from '../../helpers/getEntityById';
import type { ContractStage } from '../../types/contract';
import { getStageColumnsData } from '../contracts/details/tabs/stages/data';
import { mapContractToRevisionInitialValues, buildRevisionPayload } from './utils/revisionFormUtils';
import styles from './ContractRevisionCreatePage.module.scss';

const { TextArea } = Input;
export default function CreateContractRevisionPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [form] = useForm();
  const { showNotification, contextHolder } = useNotification();
  const [stages, setStages] = useState<ContractStage[]>([]);
  const { data: contract, isLoading: isContractLoading, isError: isContractError } = useContractById(contractId!);
  const { data: stagesData = [], isLoading: isStagesLoading, isError: isStagesError } = useContractStages(contractId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData([
    'contractStates',
    'contractCategories',
    'partners',
    'users',
    'contractTypes',
    'contractStageStates',
    'contracts',
  ]);
  const { mutate, isPending: isCreateLoading } = useCreateContractRevision();
  useEffect(() => {
    if (contract) {
      form.setFieldsValue(mapContractToRevisionInitialValues(contract));
    }
  }, [contract, form]);
  useEffect(() => {
    if (stagesData.length > 0) {
      setStages(stagesData);
    }
  }, [stagesData]);
  const handleStageEdit = (record: ContractStage) => {
    navigate(`/stages/${record.id}/edit`, {
      state: {
        isRevision: true,
      },
    });
  };
  const handleStageDelete = (record: ContractStage) => {
    if (getEntityById(record.state_id, referenceBooks?.contractStageStates)?.code !== 'COMPLETED') {
      setStages(prev => [...prev.filter(el => el.id !== record.id)]);
    } else {
      showNotification('error', 'Ошибка', 'Нельзя удалять завершенные этапы');
    }
  };
  const handleAddStage = () => {
    navigate(`/stages/create`, {
      state: {
        isRevision: true,
      },
    });
  };
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!contractId || !contract) return;
    const data = buildRevisionPayload(values, stages, contract);
    mutate(
      { contractId, data },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Договор успешно создан');
          setTimeout(() => navigate(-1), 1000);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось создать договор');
        },
      },
    );
  };
  const handleCancel = () => {
    navigate(`/contracts/${contractId}/revisions`);
  };
  if (isContractLoading || isReferencesLoading || isStagesLoading || isCreateLoading) {
    return <Loader />;
  }
  if (isContractError || isReferencesError || !contract) {
    return <NotFound errorMessage='Договор не найден' />;
  }
  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader
        title='Создание новой ревизии договора'
        subtitle={<Tag color='blue'>На основе версии: {contract.number}</Tag>}
      />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          initialValues={{
            is_active: true,
          }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name='number'
                label='Номер договора'
                rules={[{ required: true, message: 'Введите номер договора' }]}
              >
                <Input placeholder='Введите номер' />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name='cipher' label='Шифр'>
                <Input placeholder='Введите шифр' />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name='name'
                label='Название договора'
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder='Введите название' />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name='description' label='Описание'>
                <TextArea rows={3} placeholder='Введите описание' />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name='partner_id' label='Партнер'>
                <Select placeholder='Выберите партнера' loading={isReferencesLoading} allowClear>
                  {referenceBooks?.partners?.map(partner => (
                    <Select.Option key={partner.id} value={partner.id}>
                      {partner.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name='category_id' label='Категория'>
                <Select placeholder='Выберите категорию' loading={isReferencesLoading} allowClear>
                  {referenceBooks?.contractCategories?.map(category => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name='amount_excl_vat' label='Сумма без НДС'>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name='vat_rate' label='Ставка НДС (%)'>
                <InputNumber style={{ width: '100%' }} min={0} max={100} formatter={value => `${value}%`} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name='amount_incl_vat' label='Сумма с НДС'>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name='start_date' label='Дата начала'>
                <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name='end_date' label='Дата окончания'>
                <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name='date_signed' label='Дата подписания'>
                <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name='state_id' label='Состояние'>
                <Select placeholder='Выберите состояние' loading={isReferencesLoading} allowClear>
                  {referenceBooks?.contractStates?.map(state => (
                    <Select.Option key={state.id} value={state.id}>
                      {state.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name='is_active' label='Статус активности' valuePropName='checked'>
                <Switch checkedChildren='Активен' unCheckedChildren='Не активен' />
              </Form.Item>
            </Col>
          </Row>

          <Space direction='vertical' style={{ width: '100%' }} size='middle'>
            <Button type='primary' icon={<PlusOutlined />} onClick={handleAddStage}>
              Добавить этап
            </Button>

            <BasicTable<ContractStage>
              data={stages}
              loading={isStagesLoading}
              columns={[
                ...getStageColumnsData({
                  contractStageStates: referenceBooks?.contractStageStates ?? [],
                  contracts: referenceBooks?.contracts ?? [],
                }),
              ]}
              enableContextMenu={true}
              showActions
              onEdit={handleStageEdit}
              onDelete={handleStageDelete}
              rowKey='id'
            />
          </Space>

          <div className={styles.formActions}>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              Отмена
            </Button>

            <Button type='primary' icon={<SaveOutlined />} htmlType='submit' loading={isCreateLoading}>
              Создать ревизию
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
