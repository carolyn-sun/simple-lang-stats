# Simple Language Stats

Enjoy simplicity. A GitHub Action that automatically generates and updates language statistics in your README.

<!-- simple-lang-stats -->
```
JavaScript 58.5%    Fluent 33.18%       CSS 4.35%           
TypeScript 1.42%    MDX 1.13%           HTML 0.75%          
Swift 0.45%         Shell 0.12%         V 0.05%             
Ruby 0.04%                                                  
```

Based on 12 repositories for Carolyn Sun (carolyn-sun)
<!-- /simple-lang-stats -->

## Quick Start

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

Set a GitHub_TOKEN secret in your repository settings to include the data of private repositories. `Repo` scope is sufficient.