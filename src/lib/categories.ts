export function normalizeCategory(value: string) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const map: Record<string, string> = {
    liquids: 'liquids',
    liquid: 'liquids',
    'жидкости': 'liquids',
    'жидкость': 'liquids',
    electronics: 'disposables',
    'электронки': 'disposables',
    'электронка': 'disposables',
    disposables: 'disposables',
    'одноразки': 'disposables',
    'одноразка': 'disposables',
    pods: 'pods',
    'поды': 'pods',
    pod: 'pods',
    cartridges: 'cartridges',
    'картриджи': 'cartridges',
    'картридж': 'cartridges',
  };
  return map[raw] || raw;
}

export function categoryFilterMatches(filterSlug: string, productCategory: string) {
  const filter = normalizeCategory(filterSlug);
  const product = normalizeCategory(productCategory);
  if (!filter) return true;
  return filter === product;
}

export function getCategoryLabel(slug: string) {
  const key = normalizeCategory(slug);
  const labels: Record<string, string> = {
    liquids: 'Жидкости',
    disposables: 'Одноразки',
    pods: 'Поды',
    cartridges: 'Картриджи',
  };
  return labels[key] || slug;
}
