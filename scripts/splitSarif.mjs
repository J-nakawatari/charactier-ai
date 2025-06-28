#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Priority configuration
const PRIORITY_MAP = {
  // High priority (security risks)
  'js/sql-injection': 'HIGH',
  'js/reflected-xss': 'HIGH',
  'js/xss-through-dom': 'HIGH',
  'js/xss-through-exception': 'HIGH',
  'js/path-injection': 'HIGH',
  'js/server-side-unvalidated-url-redirection': 'HIGH',
  
  // Medium priority (potential risks)
  'js/regex-injection': 'MEDIUM',
  'js/clear-text-logging': 'MEDIUM',
  'js/incomplete-multi-character-sanitization': 'MEDIUM',
  'js/incomplete-url-substring-sanitization': 'MEDIUM',
  'js/incomplete-url-scheme-check': 'MEDIUM',
  'js/bad-tag-filter': 'MEDIUM',
  'js/tainted-format-string': 'MEDIUM',
  
  // Low priority (functional issues)
  'js/missing-rate-limiting': 'LOW',
  'js/missing-token-validation': 'LOW',
  'actions/missing-workflow-permissions': 'LOW'
};

// Safe fix patterns (can be automated)
const SAFE_FIX_PATTERNS = {
  'js/sql-injection': {
    pattern: /findByIdAndUpdate\s*\(\s*([^,]+),\s*([^,]+),/,
    fix: 'findByIdAndUpdate($1, { $set: $2 },'
  }
};

async function loadAlerts(filePath) {
  const data = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function splitAlerts(alerts) {
  // Filter only open alerts
  const openAlerts = alerts.filter(a => a.state === 'open');
  
  console.log(`Total alerts: ${alerts.length}`);
  console.log(`Open alerts: ${openAlerts.length}`);
  console.log(`Fixed alerts: ${alerts.filter(a => a.state === 'fixed').length}`);
  
  // Group by priority
  const groups = {
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };
  
  for (const alert of openAlerts) {
    const ruleId = alert.rule.id;
    const priority = PRIORITY_MAP[ruleId] || 'LOW';
    groups[priority].push(alert);
  }
  
  // Create output directory
  const outputDir = path.join(__dirname, '../sarif-chunks');
  await fs.promises.mkdir(outputDir, { recursive: true });
  
  // Save grouped alerts
  for (const [priority, alerts] of Object.entries(groups)) {
    if (alerts.length > 0) {
      const outputPath = path.join(outputDir, `alerts-${priority.toLowerCase()}.json`);
      await fs.promises.writeFile(outputPath, JSON.stringify(alerts, null, 2));
      console.log(`\n${priority} priority: ${alerts.length} alerts saved to ${outputPath}`);
      
      // Show rule breakdown
      const ruleCounts = {};
      for (const alert of alerts) {
        const rule = alert.rule.id;
        ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
      }
      
      for (const [rule, count] of Object.entries(ruleCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${count} ${rule}`);
      }
    }
  }
  
  // Create detailed report
  const report = {
    summary: {
      total: alerts.length,
      open: openAlerts.length,
      fixed: alerts.filter(a => a.state === 'fixed').length,
      byPriority: {
        HIGH: groups.HIGH.length,
        MEDIUM: groups.MEDIUM.length,
        LOW: groups.LOW.length
      }
    },
    openAlerts: openAlerts.map(a => ({
      id: a.number,
      rule: a.rule.id,
      severity: a.rule.severity,
      priority: PRIORITY_MAP[a.rule.id] || 'LOW',
      file: a.most_recent_instance.location.path,
      line: a.most_recent_instance.location.start_line,
      message: a.most_recent_instance.message.text.substring(0, 100) + '...'
    }))
  };
  
  await fs.promises.writeFile(
    path.join(outputDir, 'report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Create fix script for safe patterns
  const safeFixAlerts = openAlerts.filter(a => SAFE_FIX_PATTERNS[a.rule.id]);
  if (safeFixAlerts.length > 0) {
    await generateSafeFixes(safeFixAlerts, outputDir);
  }
  
  return groups;
}

async function generateSafeFixes(alerts, outputDir) {
  const fixes = [];
  
  for (const alert of alerts) {
    const rule = alert.rule.id;
    const fixPattern = SAFE_FIX_PATTERNS[rule];
    
    if (fixPattern) {
      fixes.push({
        file: alert.most_recent_instance.location.path,
        line: alert.most_recent_instance.location.start_line,
        rule: rule,
        pattern: fixPattern.pattern.toString(),
        replacement: fixPattern.fix
      });
    }
  }
  
  await fs.promises.writeFile(
    path.join(outputDir, 'safe-fixes.json'),
    JSON.stringify(fixes, null, 2)
  );
  
  console.log(`\nGenerated ${fixes.length} safe fixes`);
}

// Main execution
async function main() {
  const alertsPath = process.argv[2] || '/tmp/alerts.json';
  
  if (!fs.existsSync(alertsPath)) {
    console.error(`Alert file not found: ${alertsPath}`);
    console.error('Usage: node splitSarif.mjs [alerts.json]');
    process.exit(1);
  }
  
  try {
    const alerts = await loadAlerts(alertsPath);
    await splitAlerts(alerts);
    
    console.log('\nNext steps:');
    console.log('1. Review sarif-chunks/alerts-high.json for critical issues');
    console.log('2. Apply safe fixes with: node applySafeFixes.mjs');
    console.log('3. Manually review and fix remaining issues');
    
  } catch (error) {
    console.error('Error processing alerts:', error);
    process.exit(1);
  }
}

main();