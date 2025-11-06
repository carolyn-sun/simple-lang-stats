# Simple Language Stats

🚀 A GitHub Action that automatically generates and updates language statistics in your README.

## Project Language Statistics

<!-- simple-lang-stats -->
<table style="border-collapse: collapse; border: none; margin: 0; padding: 0; font-size: 1em;">
<tr><td style="color: #3572A5" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">TypeScript 57.2%</td><td style="color: #3572A5" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">JavaScript 15.26%</td><td style="color: #3572A5" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">Shell 11.33%</td></tr>
<tr><td style="color: #f1e05a" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">V 5.47%</td><td style="color: #f1e05a" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">Ruby 3.97%</td><td style="color: #f1e05a" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">CSS 3.83%</td></tr>
<tr><td style="color: #e34c26" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">MDX 2.7%</td><td style="color: #e34c26" style="padding: 0; border: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">PowerShell 0.23%</td><td style="padding: 0; border: none;"></td></tr>
<tr><td colspan="3" style="padding-top: 8px; border: none; font-family: inherit;">Based on 7 repositories for Carolyn Sun (carolyn-sun)</td></tr>
</table>
<!-- /simple-lang-stats -->

## Quick Start

To use this action in your repository, add it to your workflow file (e.g., `.github/workflows/update-stats.yml`):

```yaml
name: Update Language Stats

on:
  schedule:
    - cron: '0 */6 * * *'  # Run every 6 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  update-stats:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Update Language Stats
        uses: carolyn-sun/simple-lang-stats@latest
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          username: ${{ github.repository_owner }}
          
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add README.md
          git diff --staged --quiet || git commit -m "Update language statistics"
          git push
```

## Usage in Your README

Add this marker to your README.md where you want the language statistics to appear:

```markdown
<!-- simple-lang-stats -->
<!-- /simple-lang-stats -->
```

The action will automatically insert your language statistics between these markers.

## Example Output

Once the action runs, it will generate something like this in your README:

<!-- simple-lang-stats -->
<table style="border-collapse: collapse; border: none; background: none; margin: 0; padding: 0; font-size: 1em; border-spacing: 0;">
<tr style="border: none; background: none;"><td style="padding: 0; margin: 0; border: none; background: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">TypeScript 45.2%</td><td style="padding: 0; margin: 0; border: none; background: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">JavaScript 23.1%</td><td style="padding: 0; margin: 0; border: none; background: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">Python 18.5%</td></tr>
<tr style="border: none; background: none;"><td style="padding: 0; margin: 0; border: none; background: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">Java 8.7%</td><td style="padding: 0; margin: 0; border: none; background: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">Go 3.2%</td><td style="padding: 0; margin: 0; border: none; background: none; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">Shell 1.3%</td></tr>

<tr style="border: none; background: none;"><td colspan="3" style="padding-top: 8px; border: none; background: none; font-family: inherit;">Based on 24 repositories for John Doe (johndoe)</td></tr>
</table>
<!-- /simple-lang-stats -->

## Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | - |
| `username` | GitHub username to generate stats for | No | Repository owner |
| `style` | Style theme for output | No | `default` |
| `night-mode` | Force dark mode | No | `false` |
| `readme-path` | Path to README file to update | No | `README.md` |

## Styling Options

You can customize the appearance using the `style` parameter:

```yaml
- name: Update Language Stats
  uses: carolyn-sun/simple-lang-stats@v2
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    style: ocean  # Available: default, github, ocean, sunset, forest, etc.
```

Available styles: `default`, `github`, `ocean`, `sunset`, `forest`, `midnight`, `rainbow`, `pastel`, `tech`, `nature`, `monochrome`, `warm`, `cool`, `vintage`, `neon`, `earth`, `duo`, `trio`, `quad`, `penta`, `hex`, `pride`, `transgender`

## Different Repository

To generate stats for a different user:

```yaml
- name: Update Language Stats
  uses: carolyn-sun/simple-lang-stats@v2
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    username: other-username
```

## Manual Trigger

You can manually trigger the workflow from the Actions tab, or run it locally using the workflow dispatch event.

## Action Outputs

| Output | Description |
|--------|-------------|
| `stats-html` | Generated language statistics as HTML |
| `languages-count` | Number of languages found |
| `repositories-count` | Number of repositories analyzed |

## Development

To contribute or modify this action:

1. Clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Build: `npm run build`
5. Test locally or create a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
