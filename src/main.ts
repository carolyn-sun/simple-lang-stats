import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { fetchTopLanguages, calculateLanguagePercentages } from './language-stats';
import { getStyleConfig, generateLanguageColors, isValidStyle } from './style-helper';

interface GitHubUser {
  login: string;
  name: string | null;
  public_repos: number;
  total_private_repos?: number;
}

/**
 * Load environment variables from .env file for local testing
 */
function loadLocalEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('🔧 Loading local .env file for testing...');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        // Set both direct env var and INPUT_ prefixed for GitHub Actions compatibility
        const cleanKey = key.trim();
        process.env[cleanKey] = value;
        
        // Convert to GitHub Actions input format
        if (cleanKey.startsWith('INPUT_') || cleanKey === 'GITHUB_TOKEN' || cleanKey === 'GITHUB_REPOSITORY') {
          const inputKey = cleanKey.startsWith('INPUT_') ? cleanKey : `INPUT_${cleanKey.replace(/[^A-Z0-9_]/gi, '_').toUpperCase()}`;
          process.env[inputKey] = value;
        }
      }
    });
  }
}

/**
 * Get input value with fallback to environment variables for local testing
 */
function getInputWithEnvFallback(name: string, options: { required?: boolean } = {}): string {
  // Try GitHub Actions input first
  try {
    return core.getInput(name, options);
  } catch (error) {
    // Fallback to direct environment variable for local testing
    const envKey = name.toUpperCase().replace(/-/g, '_');
    const value = process.env[envKey] || process.env[`INPUT_${envKey}`] || '';
    
    if (options.required && !value) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    
    return value;
  }
}

/**
 * Generate language statistics as HTML
 */
function generateLanguageStatsHTML(
  languageData: Array<{ language: string; percentage: number }>,
  username: string,
  displayName: string,
  totalRepos: number,
  styleName?: string,
  nightMode?: boolean
): string {
  const colsPerRow = 3;
  const rows: string[] = [];
  
  // Get style configuration for potential color customization
  const styleConfig = getStyleConfig(styleName);
  const useCustomColors = styleName && isValidStyle(styleName);
  
    // Generate formatted rows with consistent spacing
    for (let i = 0; i < languageData.length; i += colsPerRow) {
      const rowLanguages = languageData.slice(i, i + colsPerRow);
      const rowIndex = Math.floor(i / colsPerRow);
      
      // Get color for this row if using custom style
      let rowStyle = '';
      if (useCustomColors && styleConfig.colors.length > 0 && styleName !== 'default') {
        const colorIndex = rowIndex % styleConfig.colors.length;
        const color = styleConfig.colors[colorIndex];
        rowStyle = ` style="color: ${color}"`;
      }
      
      // Format each language as table cell
      const cells = rowLanguages.map(({ language, percentage }) => {
        const text = `${language} ${percentage}%`;
        return `<td${rowStyle} style="padding: 0 1.5em 0 0; margin: 0; border: none; background: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${text}</td>`;
      });
      
      // Fill remaining columns if row is not complete
      while (cells.length < colsPerRow) {
        cells.push('<td style="padding: 0 1.5em 0 0; margin: 0; border: none; background: none;"></td>');
      }
      
      rows.push(`<tr style="border: none; background: none;">${cells.join('')}</tr>`);
    }
    
    const tableRows = rows.join('\n');
    const footerText = `\nBased on ${totalRepos} repositories for ${displayName} (${username})`;
    
    // Generate responsive table with flexible layout
    const htmlOutput = `<div style="width: 100%; overflow-x: auto;">
<style>
.responsive-lang-table {
  width: 100%;
  max-width: 100%;
  table-layout: auto;
}
.responsive-lang-table td {
  white-space: nowrap;
}
@media (max-width: 768px) {
  .responsive-lang-table {
    font-size: 0.9em;
  }
  .responsive-lang-table td {
    padding-right: 1em !important;
  }
}
@media (max-width: 480px) {
  .responsive-lang-table {
    font-size: 0.8em;
  }
  .responsive-lang-table td {
    padding-right: 0.8em !important;
  }
}
</style>
<table class="responsive-lang-table" style="border-collapse: collapse; border: none; background: none; margin: 0; padding: 0; font-size: 1em; border-spacing: 0;">
${tableRows}
</table>
</div>

${footerText}`;

  return htmlOutput;
}

/**
 * Update README.md with language statistics
 */
async function updateReadme(
  readmePath: string,
  statsHTML: string
): Promise<void> {
  try {
    // Read current README content
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    
    // Find the markers
    const startMarker = '<!-- simple-lang-stats -->';
    const endMarker = '<!-- /simple-lang-stats -->';
    
    const startIndex = readmeContent.indexOf(startMarker);
    const endIndex = readmeContent.indexOf(endMarker);
    
    if (startIndex === -1) {
      throw new Error(`Start marker "${startMarker}" not found in ${readmePath}`);
    }
    
    let newContent: string;
    
    if (endIndex === -1) {
      // Only start marker found, insert content and end marker
      const insertPoint = startIndex + startMarker.length;
      newContent = readmeContent.slice(0, insertPoint) + 
                   '\n' + statsHTML + '\n' + endMarker + 
                   readmeContent.slice(insertPoint);
    } else {
      // Both markers found, replace content between them
      newContent = readmeContent.slice(0, startIndex + startMarker.length) +
                   '\n' + statsHTML + '\n' +
                   readmeContent.slice(endIndex);
    }
    
    // Write updated content back to file
    fs.writeFileSync(readmePath, newContent, 'utf-8');
    
    console.log(`📝 Successfully updated ${readmePath} with language statistics`);
  } catch (error) {
    const errorMessage = `Failed to update README: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    // Try to use GitHub Actions core, fallback to console for local testing
    try {
      core.setFailed(errorMessage);
    } catch (e) {
      throw new Error(errorMessage);
    }
  }
}

/**
 * Main function
 */
export async function run(): Promise<void> {
  try {
    // Load .env file if it exists (for local testing)
    loadLocalEnv();
    
    // Get inputs with environment variable fallback
    const githubToken = getInputWithEnvFallback('github-token', { required: true });
    let username = getInputWithEnvFallback('username') || '';
    const styleName = getInputWithEnvFallback('style') || 'default';
    const nightMode = getInputWithEnvFallback('night-mode') === 'true';
    const readmePath = getInputWithEnvFallback('readme-path') || 'README.md';
    
    // For local testing, also try GITHUB_TOKEN directly
    const token = githubToken || process.env.GITHUB_TOKEN || '';
    if (!token) {
      throw new Error('GitHub token is required. Set GITHUB_TOKEN in .env file or provide github-token input.');
    }
    
    // If username is not provided, try to extract from repository context
    if (!username) {
      const repository = process.env.GITHUB_REPOSITORY;
      if (repository) {
        const [owner] = repository.split('/');
        username = owner;
      } else {
        throw new Error('Username not provided and could not extract from repository context. Set USERNAME in .env file or provide username input.');
      }
    }
    
    console.log(`🎯 Generating language statistics for user: ${username}`);
    console.log(`🎨 Using style: ${styleName}`);
    console.log(`📄 README path: ${readmePath}`);
    
    // Validate username format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(username)) {
      throw new Error('Invalid GitHub username format');
    }
    
    // Get user information
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'simple-lang-stats-action',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        throw new Error(`GitHub user "${username}" not found`);
      }
      if (userResponse.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      }
      if (userResponse.status === 401) {
        throw new Error('GitHub API authentication failed. Please check your GitHub token');
      }
      throw new Error(`GitHub API error: ${userResponse.status} ${userResponse.statusText}`);
    }
    
    const user: GitHubUser = await userResponse.json() as GitHubUser;
    
    // Fetch language statistics
    const { languages: languageStats, totalRepos } = await fetchTopLanguages(
      username,
      token,
      [], // exclude_repo array
      1,  // size_weight
      0   // count_weight
    );
    
    // Check if any language data was found
    if (Object.keys(languageStats).length === 0) {
      throw new Error(`GitHub user "${user.name || user.login}" has no public repositories with language information`);
    }
    
    // Calculate total size for percentage calculation
    const totalSize = Object.values(languageStats).reduce((sum, lang) => sum + (lang as any).size, 0);
    
    // Sort languages by usage and calculate precise percentages
    const languageData = calculateLanguagePercentages(languageStats, totalSize);
    
    const displayName = user.name || user.login;
    
    // Generate language statistics HTML
    const statsHTML = generateLanguageStatsHTML(
      languageData,
      username,
      displayName,
      totalRepos,
      styleName,
      nightMode
    );
    
    console.log('✅ Language statistics generated successfully');
    console.log(`📊 Found ${languageData.length} languages across ${totalRepos} repositories`);
    
    // Update README file
    const fullReadmePath = path.resolve(readmePath);
    await updateReadme(fullReadmePath, statsHTML);
    
    // Set outputs (for GitHub Actions)
    try {
      core.setOutput('stats-html', statsHTML);
      core.setOutput('languages-count', languageData.length.toString());
      core.setOutput('repositories-count', totalRepos.toString());
    } catch (e) {
      // Ignore errors if not in GitHub Actions environment
      console.log('📤 Outputs (for GitHub Actions):');
      console.log(`   stats-html: ${statsHTML.length} characters`);
      console.log(`   languages-count: ${languageData.length}`);
      console.log(`   repositories-count: ${totalRepos}`);
    }
    
  } catch (error) {
    const errorMessage = `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    // Try to use GitHub Actions core, fallback to console for local testing
    try {
      core.setFailed(errorMessage);
    } catch (e) {
      console.error(`❌ ${errorMessage}`);
      process.exit(1);
    }
  }
}

// Run the action if this is the main module
if (require.main === module) {
  run();
}