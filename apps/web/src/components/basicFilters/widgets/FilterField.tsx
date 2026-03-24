import { SearchOutlined } from '@ant-design/icons';
import { Checkbox, DatePicker, Input, InputNumber, Select, Space, Tag } from 'antd';
import Search from 'antd/es/input/Search';
import dayjs from 'dayjs';

import { FilterFieldConfig } from '../BasicFilters';

export const renderFilterField = (
  field: FilterFieldConfig,
  value: any,
  handleFilterChange: (key: string, value: any) => void,
) => {
  const { key, type, options = [], placeholder, icon, width = 180 } = field;
  const fieldValue = value[key];

  const convertToDayjs = (value: any) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      return value.map(date => (date && dayjs.isDayjs(date) ? date : dayjs(date)));
    }
    return dayjs.isDayjs(value) ? value : dayjs(value);
  };

  switch (type) {
    case 'search':
      return (
        <Input
          placeholder={placeholder}
          value={fieldValue || ''}
          onChange={e => handleFilterChange(key, e.target.value)}
          style={{ width }}
          allowClear
        />
      );

    case 'select':
      return (
        <Select
          placeholder={placeholder}
          value={fieldValue}
          onChange={val => handleFilterChange(key, val)}
          style={{ width }}
          allowClear
        >
          {options.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.name}
            </Select.Option>
          ))}
        </Select>
      );

    case 'multi-select':
      return (
        <Select
          placeholder={placeholder}
          mode='multiple'
          value={fieldValue || []}
          onChange={val => handleFilterChange(key, val)}
          style={{ width }}
          maxTagCount='responsive'
          allowClear
          suffixIcon={icon}
        >
          {options.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.name}
            </Select.Option>
          ))}
        </Select>
      );

    case 'date':
      return (
        <DatePicker
          placeholder={placeholder}
          value={convertToDayjs(fieldValue)}
          onChange={date => handleFilterChange(key, date)}
          style={{ width }}
          suffixIcon={icon}
        />
      );

    case 'date-range':
      return (
        <DatePicker.RangePicker
          value={convertToDayjs(fieldValue) as [dayjs.Dayjs, dayjs.Dayjs] | null}
          onChange={dates => handleFilterChange(key, dates)}
          style={{ width: width + 100 }}
          placeholder={['Начало', 'Конец']}
          suffixIcon={icon}
        />
      );

    case 'number-range':
      const [minValue, maxValue] = Array.isArray(fieldValue) ? fieldValue : [null, null];

      return (
        <Space.Compact style={{ width: width + 100 }}>
          <InputNumber
            placeholder={Array.isArray(placeholder) ? placeholder[0] : 'От'}
            value={minValue}
            onChange={val => {
              const newValue = [val, maxValue];
              handleFilterChange(key, newValue);
            }}
            style={{ width: '50%' }}
            min={0}
            step={0.01}
            precision={2}
            formatter={value => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '')}
            parser={value => (value ? value.replace(/\s/g, '') : '')}
          />
          <InputNumber
            placeholder={Array.isArray(placeholder) ? placeholder[1] : 'До'}
            value={maxValue}
            onChange={val => {
              const newValue = [minValue, val];
              handleFilterChange(key, newValue);
            }}
            style={{ width: '50%' }}
            min={0}
            step={0.01}
            precision={2}
            formatter={value => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '')}
            parser={value => (value ? value.replace(/\s/g, '') : '')}
          />
        </Space.Compact>
      );

    case 'checkbox':
      const checkboxOptions = options.map(option => ({
        label: option.name,
        value: option.id,
      }));

      return (
        <Checkbox.Group
          options={checkboxOptions}
          value={fieldValue || []}
          onChange={vals => handleFilterChange(key, vals)}
        />
      );

    default:
      return null;
  }
};
