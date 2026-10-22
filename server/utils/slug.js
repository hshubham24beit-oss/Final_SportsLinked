function slugify(value) {
  const base = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 68)
    .replace(/-+$/g, '');

  if (!base) {
    return 'profile';
  }

  return base.length < 3 ? `${base}-profile` : base;
}

function slugWithSuffix(base, suffix) {
  const cleanBase = slugify(base);
  return `${cleanBase.slice(0, 76)}-${suffix}`.replace(/-+$/g, '');
}

module.exports = { slugify, slugWithSuffix };
