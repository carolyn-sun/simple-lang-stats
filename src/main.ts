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
    if (useCustomColors && styleConfig.colors.length > 0) {
      const colorIndex = rowIndex % styleConfig.colors.length;
      const color = styleConfig.colors[colorIndex];
      rowStyle = ` style="color: ${color}"`;
    }
    
    // Format each language with consistent width (20 characters per column)
    const formattedLanguages = rowLanguages.map(({ language, percentage }) => {
      const text = `${language} ${percentage}%`;
      return `<span${rowStyle}>${text.padEnd(20)}</span>`;
    });
    
    // Fill remaining columns with spaces if row is not complete
    while (formattedLanguages.length < colsPerRow) {
      formattedLanguages.push('<span>' + ''.padEnd(20) + '</span>');
    }
    
    rows.push(formattedLanguages.join(''));
  }
  
  const statsLines = rows.join('\n');
  const footerText = `\n<em>Based on ${totalRepos} repositories for ${displayName} (${username})</em>`;
  
  // Generate monospace formatted output
  const htmlOutput = `<pre style="font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 1em; margin: 0; white-space: pre; overflow-x: auto;">
${statsLines}${footerText}
</pre>`;
  
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
      core.setFailed(`Start marker "${startMarker}" not found in ${readmePath}`);
      return;
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
    
    core.info(`Successfully updated ${readmePath} with language statistics`);
  } catch (error) {
    core.setFailed(`Failed to update README: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main function
 */
async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github-token', { required: true });
    let username = core.getInput('username') || '';
    const styleName = core.getInput('style') || 'default';
    const nightMode = core.getInput('night-mode') === 'true';
    const readmePath = core.getInput('readme-path') || 'README.md';
    
    // If username is not provided, try to extract from repository context
    if (!username) {
      const repository = process.env.GITHUB_REPOSITORY;
      if (repository) {
        const [owner] = repository.split('/');
        username = owner;
      } else {
        core.setFailed('Username not provided and could not extract from repository context');
        return;
      }
    }
    
    core.info(`Generating language statistics for user: ${username}`);
    
    // Validate username format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(username)) {
      core.setFailed('Invalid GitHub username format');
      return;
    }
    
    // Get user information
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'simple-lang-stats-action',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        core.setFailed(`GitHub user "${username}" not found`);
        return;
      }
      if (userResponse.status === 403) {
        core.setFailed('GitHub API rate limit exceeded');
        return;
      }
      if (userResponse.status === 401) {
        core.setFailed('GitHub API authentication failed. Please check your GitHub token');
        return;
      }
      throw new Error(`GitHub API error: ${userResponse.status} ${userResponse.statusText}`);
    }
    
    const user: GitHubUser = await userResponse.json() as GitHubUser;
    
    // Fetch language statistics
    const { languages: languageStats, totalRepos } = await fetchTopLanguages(
      username,
      githubToken,
      [], // exclude_repo array
      1,  // size_weight
      0   // count_weight
    );
    
    // Check if any language data was found
    if (Object.keys(languageStats).length === 0) {
      core.setFailed(`GitHub user "${user.name || user.login}" has no public repositories with language information`);
      return;
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
    
    core.info('Language statistics generated successfully');
    core.info(`Found ${languageData.length} languages across ${totalRepos} repositories`);
    
    // Update README file
    const fullReadmePath = path.resolve(readmePath);
    await updateReadme(fullReadmePath, statsHTML);
    
    // Set outputs
    core.setOutput('stats-html', statsHTML);
    core.setOutput('languages-count', languageData.length.toString());
    core.setOutput('repositories-count', totalRepos.toString());
    
  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Run the action if this is the main module
if (require.main === module) {
  run();
}