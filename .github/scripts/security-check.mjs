#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { execFileSync } from 'child_process';
import { writeFileSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SECURITY_PROMPT = `You are a security expert reviewing code changes for potential security vulnerabilities.

Analyze the provided git diff for security issues including but not limited to:
- Command injection vulnerabilities
- SQL injection
- Cross-site scripting (XSS)
- Path traversal
- Insecure deserialization
- Hardcoded secrets or API keys
- Unsafe use of eval() or similar dynamic code execution
- Insecure cryptographic practices
- Authentication/authorization issues
- Insecure file operations
- Missing input validation
- CSRF vulnerabilities
- Exposed sensitive data
- Dependency vulnerabilities
- Unsafe regex patterns (ReDoS)

For each finding, provide:
1. **Severity**: Critical, High, Medium, or Low
2. **Issue**: Brief description of the vulnerability
3. **Location**: File and line numbers
4. **Recommendation**: How to fix it
5. **Category**: Type of vulnerability (e.g., "Command Injection", "XSS")

Format your response as JSON with this structure:
{
  "findings": [
    {
      "severity": "Critical|High|Medium|Low",
      "category": "vulnerability type",
      "issue": "description",
      "location": "file:line",
      "recommendation": "how to fix"
    }
  ],
  "summary": "Brief overall assessment"
}

If no security issues are found, return:
{
  "findings": [],
  "summary": "No security issues detected."
}`;

function getCommitRange() {
  const githubContext = JSON.parse(process.env.GITHUB_CONTEXT || '{}');
  const eventName = githubContext.event_name;

  if (eventName === 'pull_request') {
    const baseRef = githubContext.event?.pull_request?.base?.sha;
    const headRef = githubContext.event?.pull_request?.head?.sha;
    if (baseRef && headRef) {
      return `${baseRef}..${headRef}`;
    }
  } else if (eventName === 'push') {
    const before = githubContext.event?.before;
    const after = githubContext.event?.after;

    // For new branches or first commit, compare with HEAD~1 or main
    if (!before || before === '0000000000000000000000000000000000000000') {
      try {
        execFileSync('git', ['rev-parse', 'HEAD~1'], { stdio: 'pipe' });
        return 'HEAD~1..HEAD';
      } catch {
        // If no previous commit, just analyze the current commit
        return 'HEAD^..HEAD';
      }
    }

    if (before && after) {
      return `${before}..${after}`;
    }
  }

  // Fallback: analyze the last commit
  return 'HEAD~1..HEAD';
}

function getGitDiff(commitRange) {
  try {
    const diff = execFileSync('git', ['diff', commitRange], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB max
    });
    return diff;
  } catch (error) {
    console.error('Error getting git diff:', error.message);
    throw error;
  }
}

async function analyzeWithClaude(diff) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.2,
      system: SECURITY_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this git diff for security vulnerabilities:\n\n${diff}`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Extract JSON from the response (handle markdown code blocks)
    let jsonText = textContent.text.trim();
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else if (jsonText.startsWith('```') && jsonText.endsWith('```')) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error analyzing with Claude:', error.message);
    throw error;
  }
}

function generateMarkdownReport(analysis) {
  let report = '# Security Analysis Report\n\n';
  report += `**Summary:** ${analysis.summary}\n\n`;

  if (analysis.findings.length === 0) {
    report += '✅ No security issues detected.\n';
    return report;
  }

  report += `**Total Findings:** ${analysis.findings.length}\n\n`;

  const severityCounts = analysis.findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {});

  report += '## Severity Breakdown\n\n';
  for (const [severity, count] of Object.entries(severityCounts)) {
    const emoji = {
      Critical: '🔴',
      High: '🟠',
      Medium: '🟡',
      Low: '🟢',
    }[severity] || '⚪';
    report += `- ${emoji} **${severity}**: ${count}\n`;
  }
  report += '\n';

  const groupedFindings = analysis.findings.reduce((acc, finding) => {
    if (!acc[finding.severity]) {
      acc[finding.severity] = [];
    }
    acc[finding.severity].push(finding);
    return acc;
  }, {});

  const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
  for (const severity of severityOrder) {
    if (!groupedFindings[severity]) continue;

    report += `## ${severity} Severity Issues\n\n`;
    for (const finding of groupedFindings[severity]) {
      report += `### ${finding.category}\n\n`;
      report += `**Location:** \`${finding.location}\`\n\n`;
      report += `**Issue:** ${finding.issue}\n\n`;
      report += `**Recommendation:** ${finding.recommendation}\n\n`;
      report += '---\n\n';
    }
  }

  return report;
}

function setGitHubOutput(key, value) {
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    appendFileSync(githubOutput, `${key}=${value}\n`);
  } else {
    console.log(`::set-output name=${key}::${value}`);
  }
}

async function main() {
  try {
    console.log('Starting security analysis...');

    const commitRange = getCommitRange();
    console.log(`Analyzing commits: ${commitRange}`);

    const diff = getGitDiff(commitRange);

    if (!diff || diff.trim().length === 0) {
      console.log('No changes to analyze.');
      setGitHubOutput('has_findings', 'false');
      setGitHubOutput('has_critical', 'false');
      return;
    }

    console.log(`Analyzing ${diff.length} characters of diff...`);

    const analysis = await analyzeWithClaude(diff);
    console.log(`Analysis complete. Found ${analysis.findings.length} issues.`);

    const hasFindings = analysis.findings.length > 0;
    const hasCritical = analysis.findings.some(
      (f) => f.severity === 'Critical' || f.severity === 'High'
    );

    setGitHubOutput('has_findings', hasFindings ? 'true' : 'false');
    setGitHubOutput('has_critical', hasCritical ? 'true' : 'false');

    if (hasFindings) {
      const report = generateMarkdownReport(analysis);
      const reportPath = join(__dirname, '..', 'security-findings.md');
      writeFileSync(reportPath, report);
      console.log(`Report written to ${reportPath}`);
      console.log('\n' + report);
    }

    if (hasCritical) {
      console.error('\n❌ Critical or High severity security issues found!');
      process.exit(1);
    } else if (hasFindings) {
      console.warn('\n⚠️  Security issues found, but none are critical.');
    } else {
      console.log('\n✅ No security issues detected.');
    }
  } catch (error) {
    console.error('Error during security analysis:', error);
    process.exit(1);
  }
}

main();
