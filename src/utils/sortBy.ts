/**
 * Sort an array by multiple key functions.
 * @param arr - The array to sort.
 * @param keyFns - An array of functions to extract the sort keys.
 * @returns - The sorted array (new array).
 */
export const toSortedBy = <T>(
  arr: T[],
  keyFns: Array<[func: (item: T) => any, order: 'asc' | 'desc']>
): T[] => {
  return arr
    .map(item => ({ item, keys: keyFns.map(([fn]) => fn(item)) }))
    .sort((a, b) => {
      for (let i = 0; i < a.keys.length; i++) {
        const order = keyFns[i][1];
        const vA = a.keys[i];
        const vB = b.keys[i];
        if (vA !== vB) {
          if (typeof vA === 'number' && typeof vB === 'number') {
            return order === 'asc' ? vA - vB : vB - vA;
          } else {
            // some of the values are strings
            return order === 'asc'
              ? String(vA).localeCompare(String(vB))
              : String(vB).localeCompare(String(vA));
          }
        }
      }
      return 0;
    })
    .map(({ item }) => item);
};
