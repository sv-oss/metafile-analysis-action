export const toDecimalPlaces = (v: number, decimals: number) => {
  const power = Math.pow(10, decimals);
  return Math.round(v * power) / power;
};
