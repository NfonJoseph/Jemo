/**
 * List of major cities in Cameroon
 * Used for product location and delivery calculations
 */
export const CAMEROON_CITIES = [
  // Regional Capitals
  { value: 'douala', label: 'Douala', region: 'Littoral' },
  { value: 'yaounde', label: 'Yaoundé', region: 'Centre' },
  { value: 'garoua', label: 'Garoua', region: 'North' },
  { value: 'bamenda', label: 'Bamenda', region: 'Northwest' },
  { value: 'maroua', label: 'Maroua', region: 'Far North' },
  { value: 'bafoussam', label: 'Bafoussam', region: 'West' },
  { value: 'ngaoundere', label: 'Ngaoundéré', region: 'Adamawa' },
  { value: 'bertoua', label: 'Bertoua', region: 'East' },
  { value: 'ebolowa', label: 'Ebolowa', region: 'South' },
  { value: 'buea', label: 'Buea', region: 'Southwest' },
  
  // Other Major Cities
  { value: 'kribi', label: 'Kribi', region: 'South' },
  { value: 'limbe', label: 'Limbe', region: 'Southwest' },
  { value: 'kumba', label: 'Kumba', region: 'Southwest' },
  { value: 'nkongsamba', label: 'Nkongsamba', region: 'Littoral' },
  { value: 'edea', label: 'Edéa', region: 'Littoral' },
  { value: 'loum', label: 'Loum', region: 'Littoral' },
  { value: 'mbalmayo', label: 'Mbalmayo', region: 'Centre' },
  { value: 'sangmelima', label: 'Sangmélima', region: 'South' },
  { value: 'dschang', label: 'Dschang', region: 'West' },
  { value: 'foumban', label: 'Foumban', region: 'West' },
  { value: 'mbouda', label: 'Mbouda', region: 'West' },
  { value: 'bafang', label: 'Bafang', region: 'West' },
  { value: 'bandjoun', label: 'Bandjoun', region: 'West' },
  { value: 'tiko', label: 'Tiko', region: 'Southwest' },
  { value: 'mutengene', label: 'Mutengene', region: 'Southwest' },
  { value: 'wum', label: 'Wum', region: 'Northwest' },
  { value: 'fundong', label: 'Fundong', region: 'Northwest' },
  { value: 'kumbo', label: 'Kumbo', region: 'Northwest' },
  { value: 'nkambe', label: 'Nkambe', region: 'Northwest' },
  { value: 'mamfe', label: 'Mamfe', region: 'Southwest' },
  { value: 'kousseri', label: 'Kousseri', region: 'Far North' },
  { value: 'mora', label: 'Mora', region: 'Far North' },
  { value: 'mokolo', label: 'Mokolo', region: 'Far North' },
  { value: 'guider', label: 'Guider', region: 'North' },
  { value: 'pitoa', label: 'Pitoa', region: 'North' },
  { value: 'meiganga', label: 'Meiganga', region: 'Adamawa' },
  { value: 'tibati', label: 'Tibati', region: 'Adamawa' },
  { value: 'batouri', label: 'Batouri', region: 'East' },
  { value: 'yokadouma', label: 'Yokadouma', region: 'East' },
  { value: 'abong_mbang', label: 'Abong-Mbang', region: 'East' },
] as const;

export type CameroonCity = typeof CAMEROON_CITIES[number]['value'];

/**
 * Get city label by value
 */
export function getCityLabel(value: string): string {
  const city = CAMEROON_CITIES.find(c => c.value === value);
  return city?.label || value;
}

/**
 * Validate if a city value is valid
 */
export function isValidCity(value: string): boolean {
  return CAMEROON_CITIES.some(c => c.value === value);
}

/**
 * Get cities by region
 */
export function getCitiesByRegion(region: string): typeof CAMEROON_CITIES[number][] {
  return CAMEROON_CITIES.filter(c => c.region === region);
}
