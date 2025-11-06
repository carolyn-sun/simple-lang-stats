interface LanguageStats {
    [language: string]: {
        name: string;
        color: string;
        size: number;
        count: number;
    };
}
/**
 * Calculate precise percentages ensuring they sum close to 100%
 * Based on GitHub's algorithm for language statistics
 */
export declare function calculateLanguagePercentages(languageStats: LanguageStats, totalSize: number): {
    language: string;
    size: number;
    percentage: number;
}[];
/**
 * Fetch top languages using GitHub's GraphQL API
 * Based on GitHub's algorithm for language statistics
 */
export declare function fetchTopLanguages(username: string, githubToken?: string, excludeRepos?: string[], sizeWeight?: number, countWeight?: number): Promise<{
    languages: LanguageStats;
    totalRepos: number;
}>;
export {};
