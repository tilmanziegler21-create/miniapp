/** @typedef {'liquids'|'disposables'|'pods'|'cartridges'|string} CategorySlug */

export function normalizeCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const map = {
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
    'pod': 'pods',
    cartridges: 'cartridges',
    'картриджи': 'cartridges',
    'картридж': 'cartridges',
  };
  return map[raw] || raw;
}

export function categoryFilterMatches(filterSlug, productCategory) {
  const filter = normalizeCategory(filterSlug);
  const product = normalizeCategory(productCategory);
  if (!filter) return true;
  return filter === product;
}

export function getCategoryLabel(slug) {
  const key = normalizeCategory(slug);
  const labels = {
    liquids: 'Жидкости',
    disposables: 'Одноразки',
    pods: 'Поды',
    cartridges: 'Картриджи',
  };
  return labels[key] || String(slug || '');
}
