export const initialFormValues = {
  name: '',
};

export const getColumnsData = () => [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    render: (name: string) => name || '-',
  },
];
