export function getUserIdsFromString(htmlString: string): string[] {
  const userIds: string[] = [];

  const regex = /data-user-id="([^"]*)"/g;

  let match;
  while ((match = regex.exec(htmlString)) !== null) {
    if (match[1]) {
      const userId = match[1];
      if (userId.length > 0 && !userIds.includes(userId)) {
        userIds.push(userId);
      }
    }
  }

  return userIds;
}
