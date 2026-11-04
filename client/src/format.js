const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2017-03-01' -> 'Mar 2017'
export function formatMonth(isoDate) {
  const [year, month] = isoDate.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

// 'staff' -> 'Staff'
export const label = (aspect) => aspect.charAt(0).toUpperCase() + aspect.slice(1);

// 41.66 -> '41.7%'
export const pct = (value) => `${value.toFixed(1)}%`;
