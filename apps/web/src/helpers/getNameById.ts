export const getNameById = (id: string | undefined, book: { id: string; name: string }[] = []) => {
  if (!id || !book.length) return;
  return book?.find(entry => entry.id === id)?.name;
};
