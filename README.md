# Simple Language Stats

Enjoy simplicity. A GitHub Action that automatically generates and updates language statistics in your README profile.

<!-- simple-lang-stats -->
```
36.03% ==    JavaScript
23.25% =     Fluent
14.34% =     TypeScript
 7.45% =     Python
 5.86% =     TeX
 3.95% =     Astro
 2.34% =     CSS
 2.22% =     C#
 1.43% =     MDX
  1.3% =     BibTeX Style
 0.86% =     HTML
 0.29% =     Swift
 0.23% =     Julia
 0.19% =     Shell
 0.09% =     Typst
 0.05% =     XSLT
 0.04% =     Ruby
 0.03% =     Makefile
 0.03% =     PowerShell
 0.01% =     Perl
 0.01% =     Batchfile
```
*Based on 25 non-forked repositories for Carolyn Sun (carolyn-sun)<br/>Powered by [carolyn-sun/simple-lang-stats](https://github.com/carolyn-sun/simple-lang-stats)*
<!-- /simple-lang-stats -->

## Usage

Set a `PAT` secret in your repository settings in case you reach the API rate limit. `Repo` scope is sufficient.

Add this marker to your README.md where you want the language statistics to appear:

```markdown
<!-- simple-lang-stats -->
<!-- /simple-lang-stats -->
```

The action will automatically insert your language statistics between these markers.

Then, add it to your workflow file (e.g., `.github/workflows/update-stats.yml`):

```yaml
name: Update language stats

on:
  push:
  schedule:
    - cron: '0 */48 * * *'  # Run every 48 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  update-stats:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Allow writing to repository contents
      
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
        
      - name: Update Language Stats
        uses: carolyn-sun/simple-lang-stats@latest
        with:
          PAT: ${{ secrets.PAT }}
          username: ${{ github.repository_owner }}
          
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add README.md
          git diff --staged --quiet || git commit -m "Update language statistics"
          git push
```
