export function card(title: string, content: HTMLElement): HTMLElement {
  const s = el('section', '', 'card result');
  s.append(el('h2', title, 'card-title'), content);
  return s;
}

export function el(tag: string, text: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  return e;
}
