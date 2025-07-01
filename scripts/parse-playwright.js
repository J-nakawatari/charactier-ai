const { readFileSync, mkdirSync, existsSync } = require('fs');
const { dirname } = require('path');
const { writeUtf8 } = require('./_shared/fs');

const inputPath = 'test-results/results.json';
const outputPath = 'coverage/failures.md';

try {
  // Create coverage directory if it doesn't exist
  mkdirSync(dirname(outputPath), { recursive: true });

  if (!existsSync(inputPath)) {
    console.error(`Error: ${inputPath} not found. Run tests first.`);
    process.exit(1);
  }

  const jsonData = readFileSync(inputPath, 'utf-8');
  const report = JSON.parse(jsonData);

  const failures = [];

  // Extract failures from test results
  const extractFailures = (suite, projectName = '') => {
    // Handle specs array (new format)
    if (suite.specs) {
      suite.specs.forEach((spec) => {
        if (spec.tests) {
          spec.tests.forEach((test) => {
            test.results.forEach((result) => {
              if (result.status === 'failed' || result.status === 'timedOut') {
                const error = result.errors && result.errors[0] 
                  ? (result.errors[0].message || result.errors[0].value || 'Unknown error')
                  : 'Test failed';
                
                failures.push({
                  file: `${spec.file || spec.location?.file || 'unknown'}:${test.line || test.location?.line || 0}`,
                  title: test.title,
                  browser: result.projectName || projectName || 'unknown',
                  error: error.split('\n')[0].substring(0, 100) + (error.length > 100 ? '...' : '')
                });
              }
            });
          });
        }
      });
    }
    
    // Handle old format with tests array
    if (suite.tests) {
      suite.tests.forEach((test) => {
        test.results.forEach((result) => {
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
    
    // Recursively process nested suites
    if (suite.suites) {
      suite.suites.forEach((s) => extractFailures(s, suite.projectName || projectName));
    }
  };

  // Also check for errors in the report
  if (report.errors && report.errors.length > 0) {
    report.errors.forEach((error, index) => {
      failures.push({
        file: error.location?.file || 'unknown',
        title: error.message || `Error ${index + 1}`,
        browser: 'unknown',
        error: (error.message || 'Unknown error').split('\n')[0].substring(0, 100)
      });
    });
  }
  
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
      markdown += `| ${failure.file} | ${failure.title} | ${failure.browser} | ${failure.error.replace(/\|/g, '\\|')} |\n`;
    });
  }

  writeUtf8(outputPath, markdown);
  console.log(`✅ Generated ${outputPath} with ${failures.length} failure(s)`);

} catch (error) {
  console.error('Error parsing playwright results:', error);
  process.exit(1);
}