export const getChangedFields = (current: any, initial: any) => {
  const changed: any = {};

  Object.keys(current).forEach(key => {
    if (JSON.stringify(current[key]) !== JSON.stringify(initial[key])) {
      changed[key] = current[key];
    }
  });

  return changed;
};
