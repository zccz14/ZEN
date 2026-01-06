# GitHub Pages Deployment Configuration

This directory contains the GitHub Pages deployment configuration for the ZEN project documentation site.

## Workflow

### `pages.yml`

This workflow automatically builds the ZEN project documentation site and deploys it to GitHub Pages.

**Triggers:**

- Push to the `main` branch (when changes occur in `demo/src/`, `package.json`, or workflow files)
- Pull Request targeting the `main` branch
- Manual trigger

**Workflow Steps:**

1.  **Checkout code**: Check out code from the remote branch to ensure code synchronization.
2.  **Setup Node.js**: Configure the Node.js 20.x environment.
3.  **Install dependencies**: Install project dependencies using `npm ci`.
4.  **Build zengen**: Build the local zengen package.
5.  **Install zengen**: Install the locally built zengen as a global tool.
6.  **Test zengen CLI**: Verify the CLI tool functions correctly.
7.  **Build documentation site**: Build the documentation using `cd demo/src && zengen build`, outputting to the `.zen/dist` directory.
8.  **Configure Pages**: Set up GitHub Pages.
9.  **Upload artifact**: Upload the built documentation site as a Pages artifact.
10. **Deploy to GitHub Pages**: Automatically deploy to GitHub Pages.

## Accessing the Documentation Site

After successful deployment, the documentation site will be accessible at the following URL:

```
https://[username].github.io/[repository-name]/
```

## Custom Configuration

### Custom Domain

If you need to use a custom domain, you can add a CNAME file after the build step:

```yaml
# Create CNAME file (if a custom domain is needed)
echo "docs.example.com" > docs-dist/CNAME
```

### Build Options

The currently used build command:

```bash
cd demo/src
zengen build --verbose
```

Available options:

- `--verbose`: Show detailed output.
- `--watch`: Watch mode (not suitable for CI/CD).
- `--template`: Specify a custom template file.
- `--config`: Specify a configuration file.

### Environment Variables

The workflow uses the following environment variables:

- `GITHUB_TOKEN`: Automatically provided GitHub token.
- `NODE_VERSION`: Node.js version (defaults to 20.x).

## Troubleshooting

### Build Failures

1.  **Check Node.js version**: Ensure a supported Node.js version is used.
2.  **Verify dependency installation**: Ensure `npm ci` executes successfully.
3.  **Check build output**: Review the detailed output of `zengen build`.
4.  **CLI output directory issue**: ZEN now enforces output to the `.zen/dist` directory; the `--out` parameter is no longer supported.

### Deployment Failures

1.  **Check permissions**: Ensure the workflow has the correct write permissions for Pages.
2.  **Verify artifact**: Ensure the `.zen/dist` directory contains valid HTML files.
3.  **Review logs**: Check the GitHub Actions logs for detailed error messages.

### Documentation Not Updating

1.  **Check triggers**: Ensure files in the `demo/src/` directory were modified.
2.  **Wait for deployment completion**: GitHub Pages deployment may take a few minutes.
3.  **Clear browser cache**: The browser might be caching an old version.

## Manual Trigger

You can manually trigger the deployment via the GitHub Actions interface:

1.  Go to the repository's "Actions" tab.
2.  Select the "Deploy to GitHub Pages" workflow.
3.  Click the "Run workflow" button.
4.  Select the branch and run.

## Related Files

- `demo/src/`: Documentation source files (Markdown format).
- `package.json`: Project configuration and dependencies.
- `src/cli.ts`: zengen CLI tool implementation.
- `src/builder.ts`: Documentation builder implementation.