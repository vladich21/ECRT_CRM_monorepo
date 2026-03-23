export const scrollToElement = (elementId: string, highlightDuration: number = 2000): void => {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const contentDiv = element.querySelector('[class*="content"]') as HTMLElement;
  if (!contentDiv) return;

  const originalBackground = contentDiv.style.background;

  contentDiv.style.background = '#91caff';
  contentDiv.style.transition = 'background 1.2s ease-out';

  setTimeout(() => {
    contentDiv.style.background = originalBackground || 'transparent';
  }, 800);

  setTimeout(() => {
    contentDiv.style.background = '';
    contentDiv.style.transition = '';
  }, highlightDuration);
};
