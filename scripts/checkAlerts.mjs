import fs from 'fs';
import { execSync } from 'child_process';

// GitHub CLIを使ってSARIFデータを取得
console.log('Fetching Code Scanning alerts from GitHub...');
try {
  execSync('gh api repos/J-nakawatari/charactier-ai/code-scanning/alerts --paginate > alerts.json', { stdio: 'inherit' });
  
  const alerts = JSON.parse(fs.readFileSync('alerts.json', 'utf8'));
  const openAlerts = alerts.filter(alert => alert.state === 'open');
  
  console.log(`\nTotal alerts: ${alerts.length}`);
  console.log(`Open alerts: ${openAlerts.length}`);
  
  if (openAlerts.length > 0) {
    console.log('\nOpen alerts:');
    openAlerts.forEach((alert, index) => {
      console.log(`\n${index + 1}. ${alert.rule.description}`);
      console.log(`   Rule: ${alert.rule.id}`);
      console.log(`   File: ${alert.most_recent_instance.location.path}:${alert.most_recent_instance.location.start_line}`);
      console.log(`   Message: ${alert.most_recent_instance.message.text}`);
    });
  }
} catch (error) {
  console.error('Error fetching alerts:', error.message);
}