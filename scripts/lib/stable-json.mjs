// Стабильный JSON.stringify: рекурсивно сортирует ключи объектов, чтобы
// вывод не зависел от порядка вставки — часть требования "детерминированном
// виде (стабильная сортировка ключей, отступ 2)" для seed-baseline.json.
// Массивы не трогаются — порядок их элементов сам по себе значимые данные
// (порядок вопросов/вариантов ответа), а не то, что нужно нормализовать.
export function stableStringify(value, indent = 2) {
  return JSON.stringify(sortKeysDeep(value), null, indent) + '\n'
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeysDeep(value[key])
        return acc
      }, {})
  }
  return value
}
