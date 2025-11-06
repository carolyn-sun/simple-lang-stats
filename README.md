# Simple Language Stats

Enjoy simplicity. A GitHub Action that automatically generates and updates language statistics in your README.

<!-- simple-lang-stats -->
```
55.47% TypeScript
15.88% JavaScript
11.79% Shell
5.7% V
4.13% Ruby
3.98% CSS
2.81% MDX
0.24% PowerShell
```
*Based on 7 repositories for Carolyn Sun (carolyn-sun)*<br/>Powered by [carolyn-sun/simple-lang-stats](https://github.com/carolyn-sun/simple-lang-stats)
<!-- /simple-lang-stats -->

## Quick Start

Set a `GitHub_TOKEN` secret in your repository settings in case you reach the API rate limit. `Repo` scope is sufficient.

Add this marker to your README.md where you want the language statistics to appear:

```markdown
<!-- simple-lang-stats -->
<!-- /simple-lang-stats -->
```

The action will automatically insert your language statistics between these markers.

Then, add it to your workflow file (e.g., `.github/workflows/update-stats.yml`):

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