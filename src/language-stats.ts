interface LanguageStats {
  [language: string]: {
    name: string;
    color: string;
    size: number;
    count: number;
  };
}

interface GitHubLanguageEdge {
  size: number;
  node: {
    name: string;
    color: string;
  };
}

interface GitHubRepo {
  name: string;
  languages: {
    edges: GitHubLanguageEdge[];
  };
}

interface GitHubGraphQLResponse {
  data: {
    user: {
      repositories: {
        nodes: GitHubRepo[];
      };
    };
  };
  errors?: Array<{
    message: string;
    type?: string;
  }>;
}

/**
 * Calculate precise percentages ensuring they sum close to 100%
 * Based on GitHub's algorithm for language statistics
 */
export function calculateLanguagePercentages(languageStats: LanguageStats, totalSize: number) {
  const entries = Object.entries(languageStats).sort(([, a], [, b]) => b.size - a.size);
  
  // Calculate raw percentages with higher precision
  const rawPercentages = entries.map(([language, data]) => ({
    language,
    size: data.size,
    percentage: (data.size / totalSize) * 100
  }));
  
  // Round to 2 decimal places but keep track of remainders for adjustment
  const roundedData = rawPercentages.map(item => ({
    ...item,
    rounded: parseFloat(item.percentage.toFixed(2)),
    remainder: item.percentage - parseFloat(item.percentage.toFixed(2))
  }));
  
  // Calculate the difference between 100% and sum of rounded percentages
  const sumRounded = roundedData.reduce((sum, item) => sum + item.rounded, 0);
  const difference = parseFloat((100 - sumRounded).toFixed(2));
  
  // If there's a significant difference, adjust the largest remainders
  if (Math.abs(difference) > 0.01) {
    // Sort by remainder to adjust those with largest remainders first
    const sortedByRemainder = [...roundedData].sort((a, b) => b.remainder - a.remainder);
    
    let remainingDifference = difference;
    const increment = difference > 0 ? 0.01 : -0.01;
    
    for (const item of sortedByRemainder) {
      if (Math.abs(remainingDifference) < 0.001) break;
      
      const adjustment = Math.sign(remainingDifference) * 0.01;
      item.rounded = parseFloat((item.rounded + adjustment).toFixed(2));
      remainingDifference = parseFloat((remainingDifference - adjustment).toFixed(2));
    }
  }
  
  return roundedData
    .filter(item => item.rounded > 0) // Filter out entries with 0% percentage
    .map(item => ({
      language: item.language,
      size: item.size,
      percentage: item.rounded
    }));
}

/**
 * Fetch top languages using GitHub's GraphQL API
 * Based on GitHub's algorithm for language statistics
 */
export async function fetchTopLanguages(
  username: string,
  githubToken?: string,
  excludeRepos: string[] = [],
  sizeWeight: number = 1,
  countWeight: number = 0
): Promise<{ languages: LanguageStats; totalRepos: number }> {
  
  const query = `
    query userInfo($login: String!) {
      user(login: $login) {
        repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
          nodes {
            name
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  color
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { login: username };
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'simple-lang-stats-action'
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(`GitHub API rate limit exceeded. Please try again later or provide a GitHub token for higher rate limits.`);
    }
    if (response.status === 401) {
      throw new Error(`GitHub API authentication failed. Please check your GitHub token.`);
    }
    throw new Error(`GitHub GraphQL API error: ${response.status} ${response.statusText}`);
  }

  const result: GitHubGraphQLResponse = await response.json() as GitHubGraphQLResponse;

  if (result.errors && result.errors.length > 0) {
    const firstError = result.errors[0];
    if (firstError && firstError.type === "NOT_FOUND") {
      throw new Error(firstError.message || "Could not fetch user.");
    }
    throw new Error((firstError && firstError.message) || "GraphQL API error");
  }

  let repoNodes = result.data.user.repositories.nodes;
  
  // Create a map for quick lookup of repositories to exclude
  const repoToHide: { [key: string]: boolean } = {};
  excludeRepos.forEach((repoName) => {
    repoToHide[repoName] = true;
  });

  // Filter out repositories to be hidden
  repoNodes = repoNodes.filter((repo) => !repoToHide[repo.name]);

  // Filter repositories that have language data and flatten the language list
  const languageStats: LanguageStats = {};
  let repoCount = 0;

  repoNodes
    .filter((node) => node.languages.edges.length > 0)
    .forEach((repo) => {
      repo.languages.edges.forEach((edge) => {
        const langName = edge.node.name;
        const langSize = edge.size;

        // Ignore language entries with size 0
        if (langSize <= 0) {
          return;
        }

        if (languageStats[langName]) {
          // Language already exists, add the size and increment count
          languageStats[langName].size += langSize;
          languageStats[langName].count += 1;
        } else {
          // New language entry
          languageStats[langName] = {
            name: langName,
            color: edge.node.color,
            size: langSize,
            count: 1
          };
        }
      });
    });

  // Apply size and count weights to calculate final scores
  Object.keys(languageStats).forEach((name) => {
    const lang = languageStats[name];
    if (lang) {
      lang.size =
        Math.pow(lang.size, sizeWeight) *
        Math.pow(lang.count, countWeight);
    }
  });

  // Filter out language entries with size 0 or close to 0 after weight calculation
  const filteredLanguageStats: LanguageStats = {};
  Object.keys(languageStats).forEach((name) => {
    const lang = languageStats[name];
    if (lang && lang.size > 0) {
      filteredLanguageStats[name] = lang;
    }
  });

  return {
    languages: filteredLanguageStats,
    totalRepos: repoNodes.length
  };
}