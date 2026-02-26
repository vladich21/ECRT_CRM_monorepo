export const getEntityById = <T extends { id: string }>(id: string | undefined, book: T[] | undefined = []) => {
  if (!id || !book.length) return;
  return book?.find(el => el.id === id);
};
