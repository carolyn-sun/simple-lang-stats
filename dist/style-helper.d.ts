export interface StyleConfig {
    colors: string[];
    defaultColor: string;
}
/**
 * Get color scheme configuration for specified style
 * @param styleName Style name
 * @returns StyleConfig Contains color array and default color
 */
export declare function getStyleConfig(styleName?: string): StyleConfig;
/**
 * Get corresponding color by index (cyclical)
 * @param colors Color array
 * @param index Index
 * @returns Corresponding color
 */
export declare function getColorByIndex(colors: string[], index: number): string;
/**
 * Generate color styles for language entries
 * @param styleName Style name
 * @param languageCount Number of languages
 * @returns Color array, one color per language
 */
export declare function generateLanguageColors(styleName?: string, languageCount?: number): string[];
/**
 * Get list of available styles
 * @returns Array of style names
 */
export declare function getAvailableStyles(): string[];
/**
 * Check if style exists
 * @param styleName Style name
 * @returns Whether it exists
 */
export declare function isValidStyle(styleName: string): boolean;
