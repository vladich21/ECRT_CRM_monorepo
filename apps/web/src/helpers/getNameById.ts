export const getNameById = (id: string | undefined, book: { id: string; name: string }[] = []) => {
  if (id == null || !book.length) return;
  const sid = String(id).trim();
  if (!sid) return;
  return book.find(entry => String(entry.id) === sid)?.name;
};
