# GitHub Actions Workflows

## Claude Code Integration

This repository uses Claude Code's GitHub Actions integration for automated code review and assistance.

### Available Workflows

#### 1. Claude Code Review (`claude-code-review.yml`)

Automatically reviews pull requests with a focus on security and code quality.

**Triggers:**
- Pull request opened
- Pull request synchronized (new commits)

**What it checks:**

**Security Analysis (Priority):**
- Command injection vulnerabilities
- SQL injection and XSS
- Path traversal and insecure deserialization
- Hardcoded secrets or API keys
- Unsafe dynamic code execution
- Insecure cryptographic practices
- Authentication/authorization issues
- Insecure file operations and missing input validation
- CSRF vulnerabilities and exposed sensitive data
- Dependency vulnerabilities
- Unsafe regex patterns (ReDoS)

**Code Quality:**
- Best practices and conventions
- Potential bugs
- Performance considerations
- Test coverage

**Severity Levels:**
- 🔴 **Critical**: Immediate security risk
- 🟠 **High**: Serious vulnerability
- 🟡 **Medium**: Notable issue
- 🟢 **Low**: Minor concern

#### 2. Claude PR Assistant (`claude.yml`)

Responds to `@claude` mentions in issues, PRs, and comments.

**Triggers:**
- Issue comments with `@claude`
- PR review comments with `@claude`
- PR reviews with `@claude`
- New issues with `@claude` in title or body

**Usage:**
```
@claude please review the security of this authentication flow
@claude can you suggest improvements to this function?
@claude add tests for the new feature
```

### Setup

The Claude Code OAuth token is already configured as `CLAUDE_CODE_OAUTH_TOKEN` in the repository secrets.

### Customization

**To modify security checks:**
Edit the `prompt` section in `.github/workflows/claude-code-review.yml`

**To change when reviews run:**
Edit the `on` section in `.github/workflows/claude-code-review.yml`

**To filter by PR author:**
Uncomment the `if` condition in the `claude-review` job

**To restrict file types:**
Uncomment and customize the `paths` section

### Viewing Results

**Pull Request Reviews:**
- Claude posts findings directly as PR comments
- Check the Actions tab for execution logs

**Issue/Comment Responses:**
- Claude responds directly to `@claude` mentions
- Check the Actions tab for execution logs

### Files

- `.github/workflows/claude-code-review.yml` - Automated PR security review
- `.github/workflows/claude.yml` - Interactive Claude assistant
- `.github/README.md` - This documentation
