# GitHub Actions Workflows

## Security Check with Claude

This workflow automatically analyzes commits for security vulnerabilities using Claude AI before they're made public.

### How it works

1. **Triggers**: Runs on pushes to `main` and `feature/**` branches, and on pull requests to `main`
2. **Analysis**: Uses Claude Sonnet 4.5 to analyze git diffs for common security issues
3. **Reporting**: Generates a detailed security report with severity ratings
4. **Actions**:
   - Posts findings as PR comments (for pull requests)
   - Uploads findings as artifacts
   - Fails the build on Critical or High severity issues

### Security issues checked

- Command injection vulnerabilities
- SQL injection
- Cross-site scripting (XSS)
- Path traversal
- Insecure deserialization
- Hardcoded secrets or API keys
- Unsafe dynamic code execution
- Insecure cryptographic practices
- Authentication/authorization issues
- Insecure file operations
- Missing input validation
- CSRF vulnerabilities
- Exposed sensitive data
- Dependency vulnerabilities
- Unsafe regex patterns (ReDoS)

### Setup

1. Add your Anthropic API key as a GitHub secret:
   - Go to repository Settings > Secrets and variables > Actions
   - Create a new secret named `ANTHROPIC_API_KEY`
   - Paste your Anthropic API key as the value

2. The workflow will automatically run on the next push or pull request

### Severity levels

- **Critical** 🔴: Immediate security risk, build fails
- **High** 🟠: Serious vulnerability, build fails
- **Medium** 🟡: Notable issue, build passes with warning
- **Low** 🟢: Minor concern, build passes with warning

### Viewing results

**For pull requests:**
- Security findings are posted as PR comments
- Check the Actions tab for full logs

**For direct pushes:**
- Check the Actions tab > Security Check workflow
- Download the `security-findings` artifact for detailed report

### Local testing

You can test the security check locally:

```bash
cd .github/scripts
npm install
export ANTHROPIC_API_KEY="your-api-key"
export GITHUB_CONTEXT='{"event_name":"push"}'
node security-check.mjs
```

### Troubleshooting

**Workflow fails with "ANTHROPIC_API_KEY is not set"**
- Ensure you've added the API key as a repository secret
- Check that the secret name is exactly `ANTHROPIC_API_KEY`

**False positives**
- The AI may occasionally flag code that isn't actually vulnerable
- Review the findings and update code or document why it's safe
- Consider adding code comments explaining security measures

**Rate limits**
- The workflow uses the Anthropic API which has rate limits
- Large commits may take longer to analyze
- Consider breaking up very large changes into smaller commits

### Files

- `.github/workflows/security-check.yml` - The workflow definition
- `.github/scripts/security-check.mjs` - Main analysis script
- `.github/scripts/package.json` - Dependencies for the script
