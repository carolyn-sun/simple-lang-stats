# Simple Language Stats

Enjoy simplicity.

A Cloudflare Worker that returns GitHub user language statistics as an SVG image.

## Usage

Use the URL pattern `<img src="https://sls.carolyn.sh/{github-username}" />` to get the language stats for a GitHub user.

For example, for the user `carolyn-sun`, use the URL, `<img src="https://sls.carolyn.sh/carolyn-sun" />`.

And it is highly recommended to use it with Auto Light/Dark Mode support as shown below.

```markdown
<a href="https://github.com/carolyn-sun/simple-lang-stats#gh-light-mode-only">
    <img src="https://sls.carolyn.sh/{github-username}" />
</a>

<a href="https://github.com/carolyn-sun/simple-lang-stats#gh-dark-mode-only">
    <img src="https://sls.carolyn.sh/{github-username}?night=true" />
</a>
```

<a href="https://github.com/carolyn-sun/simple-lang-stats#gh-light-mode-only">
    <img src="https://sls.carolyn.sh/carolyn-sun" />
</a>

<a href="https://github.com/carolyn-sun/simple-lang-stats#gh-dark-mode-only">
    <img src="https://sls.carolyn.sh/carolyn-sun?night=true" />
</a>

The scope is public repositories. [Deploy your own Worker](#Deployment) to include private ones. 

## Themes

You can pass a `style` query parameter to change the appearance. It works like this: `<img src="https://sls.carolyn.sh/{github-username}?style={style-name}" />`.

The styling system uses a row-based color cycling approach. All languages in the same row use the same color, while each row uses a different color from the selected theme. When the number of rows exceeds the available colors in a theme, the colors cycle back to the beginning.

You can check the available styles in [style-helper.ts](./src/style-helper.ts).

For example, to use the `transgender` style, use the URL `<img src="https://sls.carolyn.sh/carolyn-sun?style=transgender" />`.

<img src="https://sls.carolyn.sh/carolyn-sun?style=transgender" />

## Deployment

These are only relevant when deploying your own worker.

- `GITHUB_TOKEN`: Your GitHub personal access token. This is required to access the GitHub API. `Repo` should be granted. 
- `ENABLE_PRIVATE_ACCESS`: Set to `true` to include private repositories in the statistics. Defaults to `false`.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fcarolyn-sun%2Fsimple-lang-stats)
