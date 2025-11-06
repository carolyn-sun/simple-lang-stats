// Preset style color configurations
const PRESET_STYLES: { [key: string]: string[] } = {
  default: [],
  github: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2'],
  ocean: ['#006994', '#4A90E2', '#7ED321', '#F5A623', '#D0021B', '#50E3C2', '#B8E986'],
  sunset: ['#FF6B6B', '#FFE66D', '#FF8E53', '#C44569', '#F8B500', '#FF1744', '#6C5CE7'],
  forest: ['#27AE60', '#2ECC71', '#58D68D', '#82E0AA', '#52C41A', '#95DE64', '#D3F261'],
  midnight: ['#2C3E50', '#34495E', '#5D6D7E', '#85929E', '#AEB6BF', '#D5DBDB', '#F8F9FA'],
  pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFC9DE'],
  tech: ['#61DAFB', '#4FC08D', '#F7DF1E', '#E34F26', '#1572B6', '#CC6699', '#000000'],
  nature: ['#8FBC8F', '#228B22', '#32CD32', '#7CFC00', '#ADFF2F', '#9ACD32', '#6B8E23'],
  monochrome: ['#000000', '#2F2F2F', '#5F5F5F', '#808080', '#AFAFAF', '#DFDFDF', '#FFFFFF'],
  warm: ['#FF6347', '#FFA500', '#FFD700', '#FF69B4', '#FF1493', '#DC143C', '#B22222'],
  cool: ['#00CED1', '#20B2AA', '#48D1CC', '#40E0D0', '#00FFFF', '#87CEEB', '#87CEFA'],
  vintage: ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#F4A460', '#DEB887', '#F5DEB3'],
  neon: ['#FF073A', '#39FF14', '#FF10F0', '#00FFFF', '#FFFF00', '#FF8C00', '#FF69B4'],
  earth: ['#8B4513', '#228B22', '#4682B4', '#FFD700', '#FF4500', '#9932CC', '#DC143C'],
  duo: ['#FF6B6B', '#4ECDC4'],
  trio: ['#E74C3C', '#F39C12', '#2ECC71'],
  quad: ['#9B59B6', '#3498DB', '#1ABC9C', '#F1C40F'],
  penta: ['#E67E22', '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71'],
  hex: ['#34495E', '#95A5A6', '#F39C12', '#D35400', '#C0392B', '#8E44AD'],
  pride: ['#E40303', '#FF8C00', '#FFED00', '#008018', '#732982', '#004CFF'],
  transgender: ['#5BCEFA', '#F5A9B8']
};

export interface StyleConfig {
  colors: string[];
  defaultColor: string;
}

/**
 * Get color scheme configuration for specified style
 * @param styleName Style name
 * @returns StyleConfig Contains color array and default color
 */
export function getStyleConfig(styleName?: string): StyleConfig {
  const defaultColors = ['#3572A5', '#f1e05a', '#e34c26', '#563d7c', '#b07219', '#701516', '#00ADD8'];
  const style = styleName && styleName in PRESET_STYLES ? styleName : 'default';
  const colors = PRESET_STYLES[style] || defaultColors;
  
  return {
    colors: colors,
    defaultColor: colors[0] || '#24292f' // First color as default color
  };
}

/**
 * Get corresponding color by index (cyclical)
 * @param colors Color array
 * @param index Index
 * @returns Corresponding color
 */
export function getColorByIndex(colors: string[], index: number): string {
  if (colors.length === 0) return '#24292f'; // Default color
  return colors[index % colors.length] || '#24292f';
}

/**
 * Generate color styles for language entries
 * @param styleName Style name
 * @param languageCount Number of languages
 * @returns Color array, one color per language
 */
export function generateLanguageColors(styleName?: string, languageCount: number = 0): string[] {
  const styleConfig = getStyleConfig(styleName);
  const colors: string[] = [];
  
  for (let i = 0; i < languageCount; i++) {
    colors.push(getColorByIndex(styleConfig.colors, i));
  }
  
  return colors;
}

/**
 * Get list of available styles
 * @returns Array of style names
 */
export function getAvailableStyles(): string[] {
  return Object.keys(PRESET_STYLES);
}

/**
 * Check if style exists
 * @param styleName Style name
 * @returns Whether it exists
 */
export function isValidStyle(styleName: string): boolean {
  return styleName in PRESET_STYLES;
}
