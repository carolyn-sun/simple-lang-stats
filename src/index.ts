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

interface GitHubUser {
  login: string;
  name: string | null;
  public_repos: number;
  total_private_repos?: number;
}

interface WorkerEnv {
  GITHUB_TOKEN?: string;
  API_SECRET?: string;
  ENABLE_PRIVATE_ACCESS?: string;
}

/**
 * Calculate precise percentages ensuring they sum close to 100%
 * Based on GitHub's algorithm for language statistics
 */
function calculateLanguagePercentages(languageStats: LanguageStats, totalSize: number) {
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
    .filter(item => item.rounded > 0) // 过滤掉百分比为0的条目
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
async function fetchTopLanguages(
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
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'User-Agent': 'simple-lang-stats-worker'
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

  const result: GitHubGraphQLResponse = await response.json();

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

        // 忽略大小为0的语言条目
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

  // 过滤掉权重计算后大小为0或接近0的语言条目
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

export default {
  async fetch(request: Request, env?: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Handle root path help information
    if (pathname === '/' || pathname === '') {
      return new Response(
        `Simple Language Stats

Usage: /{username}

Returns 3-column layout:
Language1 X%  Language2 Y%  Language3 Z%
Language4 A%  Language5 B%  Language6 C%

Example: /octocat

Note: For higher rate limits, configure a GitHub token in your environment.
Without a token, you may encounter rate limit errors after several requests.`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/plain; charset=utf-8' 
          } 
        }
      );
    }

    // Extract username from URL path
    let username = pathname.slice(1);

    // Check user-provided GitHub Token (for accessing private repositories)
    // Token requirements:
    // - Public repos only: No scopes required
    // - Private repos: 'repo' scope required
    const userToken = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                     request.headers.get('X-GitHub-Token');
    
    // Choose which GitHub Token to use (user token takes priority for private access)
    const githubToken = userToken || env?.GITHUB_TOKEN;
    const canAccessPrivate = !!userToken && env?.ENABLE_PRIVATE_ACCESS === 'true';

    // Check if username is provided
    if (!username || username === '') {
      const errorMsg = 'Please provide a GitHub username in the URL path, e.g., https://your-worker.domain.com/octocat';
      return new Response(errorMsg, { 
        status: 400, 
        headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
      });
    }

    // Check username format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(username)) {
      const errorMsg = 'Invalid GitHub username format';
      return new Response(errorMsg, { 
        status: 400, 
        headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
      });
    }

    try {
      // Get user information first (for display name)
      const githubHeaders: HeadersInit = {
        'User-Agent': 'simple-lang-stats-worker',
        'Accept': 'application/vnd.github.v3+json'
      };

      if (githubToken) {
        githubHeaders['Authorization'] = `token ${githubToken}`;
      }

      const userResponse = await fetch(`https://api.github.com/users/${username}`, {
        headers: githubHeaders
      });

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          const errorMsg = `GitHub user "${username}" not found`;
          return new Response(errorMsg, { 
            status: 404, 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        }
        if (userResponse.status === 403) {
          const errorMsg = `GitHub API rate limit exceeded. Please try again later or provide a GitHub token for higher rate limits.`;
          return new Response(errorMsg, { 
            status: 429, 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        }
        if (userResponse.status === 401) {
          const errorMsg = `GitHub API authentication failed. Please check your GitHub token.`;
          return new Response(errorMsg, { 
            status: 401, 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        }
        throw new Error(`GitHub API error: ${userResponse.status} ${userResponse.statusText}`);
      }

      const user: GitHubUser = await userResponse.json();

      // Fetch language statistics using GraphQL API
      const { languages: languageStats, totalRepos } = await fetchTopLanguages(
        username,
        githubToken,
        [], // exclude_repo array - can be made configurable via query params if needed
        1,  // size_weight - can be made configurable via query params if needed  
        0   // count_weight - can be made configurable via query params if needed
      );

      // If no language data found
      if (Object.keys(languageStats).length === 0) {
        const errorMsg = `GitHub user "${user.name || user.login}" has no public repositories with language information`;
        return new Response(errorMsg, { 
          headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
        });
      }

      // Calculate total size for percentage calculation
      const totalSize = Object.values(languageStats).reduce((sum, lang) => sum + lang.size, 0);

      // Sort languages by usage and calculate precise percentages
      const languageData = calculateLanguagePercentages(languageStats, totalSize);

      const displayName = user.name || user.login;

      // Generate SVG with 3-column layout
      const svgWidth = 400;
      const svgHeight = Math.max(120, Math.ceil(languageData.length / 3) * 20 + 80);
      const colWidth = svgWidth / 3;
      
      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { font: bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; fill: #24292f; }
    .lang { font: 12px ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; fill: #24292f; }
    .footer { font: 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; fill: #656d76; }
  </style>
  
  <!-- Background -->
  <rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff" stroke="#d0d7de" stroke-width="1" rx="6"/>
  
  <!-- Title -->
  <text x="12" y="25" class="title">Most Used Langs</text>
`;

      // Add language entries in 3 columns
      languageData.forEach(({ language, percentage }, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = 12 + col * colWidth;
        const y = 50 + row * 20;
        
        svgContent += `  <text x="${x}" y="${y}" class="lang">${language} ${percentage}%</text>\n`;
      });

      // Add footer
      const footerY = svgHeight - 15;
      svgContent += `  <text x="12" y="${footerY}" class="footer">Based on ${totalRepos} repositories for ${displayName} (${username})</text>
</svg>`;

      return new Response(svgContent, {
        headers: { 
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });

    } catch (error) {
      console.error('Error processing request:', error);
      
      // Handle specific error types with appropriate HTTP status codes
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Rate limit errors
        if (errorMessage.includes('rate limit exceeded')) {
          return new Response(errorMessage, { 
            status: 429,
            headers: { 
              'Content-Type': 'text/plain; charset=utf-8',
              'Retry-After': '3600' // Suggest retry after 1 hour
            } 
          });
        }
        
        // Authentication errors
        if (errorMessage.includes('authentication failed')) {
          return new Response(errorMessage, { 
            status: 401, 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        }
        
        // User not found errors (already handled above, but just in case)
        if (errorMessage.includes('not found')) {
          return new Response(errorMessage, { 
            status: 404, 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        }
      }
      
      const errorMsg = `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return new Response(errorMsg, { 
        status: 500, 
        headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
      });
    }
  }
};