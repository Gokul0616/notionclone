export function saveContentToStorage(pageId: number, content: string) {
  localStorage.setItem(`notion-page-${pageId}`, content);
}

export function loadContentFromStorage(pageId: number): string | null {
  return localStorage.getItem(`notion-page-${pageId}`);
}

export function clearContentFromStorage(pageId: number) {
  localStorage.removeItem(`notion-page-${pageId}`);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function getSelectionText(): string {
  const selection = window.getSelection();
  return selection ? selection.toString() : "";
}

export function setCaretPosition(element: HTMLElement, position: number) {
  const range = document.createRange();
  const selection = window.getSelection();
  
  if (element.childNodes.length > 0) {
    const textNode = element.childNodes[0];
    const maxPosition = textNode.textContent?.length || 0;
    range.setStart(textNode, Math.min(position, maxPosition));
    range.setEnd(textNode, Math.min(position, maxPosition));
  } else {
    range.setStart(element, 0);
    range.setEnd(element, 0);
  }
  
  selection?.removeAllRanges();
  selection?.addRange(range);
  element.focus();
}

export function insertTextAtCursor(text: string) {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
  }
}
