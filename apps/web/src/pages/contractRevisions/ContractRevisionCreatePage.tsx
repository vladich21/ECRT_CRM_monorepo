import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Switch,
  Row,
  Col,
} from 'antd';
import { SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { useForm } from 'antd/es/form/Form';
import dayjs from 'dayjs';
import { useContractById } from '../../api/contracts/contractApiHooks';
import { useContractStages } from '../../api/contractStages/contractStagesApiHooks';
import { useCreateContractRevision } from '../../api/contractRevisions/contractRevisionsApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { ContractStage } from '../../types/contract';
import BasicTable from '../../components/basicTable/BasicTable';
import { getStageColumnsData } from '../contracts/details/tabs/stages/data';
import { ContractRevision } from '../../types/contract';
import { getEntityById } from '../../helpers/getEntityById';
import { useNotification } from '../../customhooks/useNotification';
import styles from './ContractRevisionCreatePage.module.scss';

const { TextArea } = Input;
const { Option } = Select;

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

  const {
    mutate,
    isPending: isCreateLoading,
    isError: isCreateError,
    isSuccess: isCreateSuccess,
  } = useCreateContractRevision();

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Договор успешно создан');
      setTimeout(() => navigate(-1), 1000);
    } else if (isCreateError) {
      showNotification('error', 'Ошибка', 'Не удалось создать договор');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification]);

  useEffect(() => {
    if (contract) {
      form.setFieldsValue({
        name: contract.name || '',
        number: contract.number || '',
        cipher: contract.cipher || '',
        description: contract.description || '',
        partner_id: contract.partner_id,
        project_id: contract.project_id,
        responsible_id: contract.responsible_id,
        category_id: contract.category_id,
        contract_type_id: contract.contract_type_id,
        amount_excl_vat: contract.amount_excl_vat,
        vat_rate: contract.vat_rate,
        amount_vat: contract.amount_vat,
        amount_incl_vat: contract.amount_incl_vat,
        start_date: contract.start_date ? dayjs(contract.start_date) : null,
        end_date: contract.end_date ? dayjs(contract.end_date) : null,
        date_signed: contract.date_signed ? dayjs(contract.date_signed) : null,
        state_id: contract.state_id,
        is_active: contract.is_active,
        comment: '',
        revision_reason: '',
      });
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
      showNotification('error', 'Ошибка', 'Нельзя удалять завершённые этапы');
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
    const data = {
      ...values,
      contract_type_id: (values.contract_type_id as string) || contract!.contract_type_id,
      stages,
    } as Omit<ContractRevision, 'contract_id' | 'revision_number'>;
    if (contractId) mutate({ contractId, data });
  };

  const handleCancel = () => {
    navigate(`/contracts/${contractId}/revisions`);
  };

  if (isContractLoading || isReferencesLoading || isStagesLoading || isCreateLoading) {
    return <Loader />;
  }

  if (isContractError || isReferencesError || !contract || isCreateError) {
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
                    <Option key={partner.id} value={partner.id}>
                      {partner.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name='category_id' label='Категория'>
                <Select placeholder='Выберите категорию' loading={isReferencesLoading} allowClear>
                  {referenceBooks?.contractCategories?.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
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
                    <Option key={state.id} value={state.id}>
                      {state.name}
                    </Option>
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
                  contractStageStates: referenceBooks?.contractStageStates!,
                  contracts: referenceBooks?.contracts!,
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
