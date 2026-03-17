const colors = {
  DRAFT: '#8E8E93',
  ON_APPROVAL: '#007AFF',
  APPROVED: '#34C759',
  SIGNED: '#1A7F37',
  REJECTED: '#FF3B30',
  CLOZED: '#AEAEB2',

  planned: '#8E8E93',
  in_progress: '#007AFF',
  completed: '#34C759',
  overdue: '#FF3B30',
  start_delay: '#FF9500',

  active: '#007AFF',
  inactive: '#AEAEB2',

  default: '#FFF',
};

export const getTagColorByData = (data?: string) => {
  return colors[(data ? data : 'default') as keyof typeof colors];
};
