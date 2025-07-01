import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

interface TestCase {
  title: string;
  titlePath: string[];
  ok: boolean;
  annotations: any[];
  location: {
    file: string;
    line: number;
    column: number;
  };
}

interface TestResult {
  title: string;
  file: string;
  line: number;
  projectName: string;
  results: Array<{
    workerIndex: number;
    status: string;
    duration: number;
    errors: Array<{
      message?: string;
      stack?: string;
      value?: string;
    }>;
    stdout: any[];
    stderr: any[];
    retry: number;
    attachments: any[];
  }>;
}

interface PlaywrightReport {
  config: any;
  suites: any[];
  errors: any[];
  stats: any;
}

const inputPath = 'coverage/playwright-results.json';
const outputPath = 'coverage/failures.md';

try {
  // Create coverage directory if it doesn't exist
  mkdirSync(dirname(outputPath), { recursive: true });

  if (!existsSync(inputPath)) {
    console.error(`Error: ${inputPath} not found. Run tests first.`);
    process.exit(1);
  }

  const jsonData = readFileSync(inputPath, 'utf-8');
  const report: PlaywrightReport = JSON.parse(jsonData);

  const failures: Array<{ file: string; title: string; browser: string; error: string }> = [];

  // Extract failures from test results
  const extractFailures = (suite: any, projectName: string = '') => {
    if (suite.tests) {
      suite.tests.forEach((test: any) => {
        test.results.forEach((result: any) => {
          if (result.status === 'failed' || result.status === 'timedOut') {
            const error = result.errors && result.errors[0] 
              ? (result.errors[0].message || result.errors[0].value || 'Unknown error')
              : 'Test failed';
            
            failures.push({
              file: `${test.location.file}:${test.location.line}`,
              title: test.title,
              browser: test.projectName || projectName || 'unknown',
              error: error.split('\n')[0].substring(0, 100) + (error.length > 100 ? '...' : '')
            });
          }
        });
      });
    }
    if (suite.suites) {
      suite.suites.forEach((s: any) => extractFailures(s, suite.projectName || projectName));
    }
  };

  report.suites.forEach(suite => extractFailures(suite));

  // Generate markdown
  let markdown = '# Playwright Test Results\n\n';
  markdown += `Generated at: ${new Date().toISOString()}\n\n`;
  
  if (failures.length === 0) {
    markdown += 'All tests passed 🎉\n';
  } else {
    markdown += `## Failed Tests: ${failures.length}\n\n`;
    markdown += '| File | Test title | Browser | Error |\n';
    markdown += '|------|------------|---------|-------|\n';
    
    failures.forEach(failure => {
      // Escape both pipe characters and backslashes for proper Markdown table rendering
      const escapedError = failure.error
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/\|/g, '\\|');  // Then escape pipe characters
      markdown += `| ${failure.file} | ${failure.title} | ${failure.browser} | ${escapedError} |\n`;
    });
  }

  writeFileSync(outputPath, markdown);
  console.log(`✅ Generated ${outputPath} with ${failures.length} failure(s)`);

} catch (error) {
  console.error('Error parsing playwright results:', error);
  process.exit(1);
}