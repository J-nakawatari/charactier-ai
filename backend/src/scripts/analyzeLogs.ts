#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import * as readline from 'readline';
import { execSync } from 'child_process';

interface ErrorEntry {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  source: 'nginx' | 'backend' | 'frontend';
  details?: string;
}

interface VersionInfo {
  file: string;
  name: string;
  version: string;
}

class LogAnalyzer {
  private errors: ErrorEntry[] = [];
  private versions: VersionInfo[] = [];
  private tempDir: string;

  constructor(private tarFile: string) {
    this.tempDir = path.join(path.dirname(tarFile), 'temp_extracted');
  }

  async analyze() {
    console.log('📦 Extracting log files...');
    await this.extractTar();

    console.log('📊 Analyzing logs...');
    await this.analyzeNginxLogs();
    await this.analyzeBackendLogs();
    await this.analyzeFrontendLogs();
    await this.analyzeVersions();

    console.log('📝 Generating report...');
    await this.generateReport();

    console.log('🧹 Cleaning up...');
    this.cleanup();
  }

  private async extractTar() {
    if (fs.existsSync(this.tempDir)) {
      execSync(`rm -rf ${this.tempDir}`);
    }
    fs.mkdirSync(this.tempDir, { recursive: true });

    await tar.x({
      file: this.tarFile,
      cwd: this.tempDir
    });
  }

  private async analyzeNginxLogs() {
    const nginxLogPath = path.join(this.tempDir, 'nginx.log');
    if (!fs.existsSync(nginxLogPath)) return;

    const fileStream = fs.createReadStream(nginxLogPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const errorPattern = /(\d+\/\w+\/\d+:\d+:\d+:\d+) .* "(\w+) ([^"]+)" (\d+)/;

    for await (const line of rl) {
      const match = line.match(errorPattern);
      if (match) {
        const [, timestamp, method, url, status] = match;
        const statusCode = parseInt(status);
        
        if ([400, 404, 502, 504].includes(statusCode)) {
          this.errors.push({
            timestamp,
            method,
            url,
            status: statusCode,
            source: 'nginx'
          });
        }
      }
    }
  }

  private async analyzeBackendLogs() {
    const backendLogPath = path.join(this.tempDir, 'backend.log');
    if (!fs.existsSync(backendLogPath)) return;

    const fileStream = fs.createReadStream(backendLogPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const errorPattern = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*\[ERROR\].*?(\w+)\s+([^\s]+).*?(\d{3})/;
    const routePattern = /Route not found.*?(\w+)\s+([^\s]+)/;

    for await (const line of rl) {
      // Check for explicit error logs
      if (line.includes('[ERROR]')) {
        const match = line.match(errorPattern);
        if (match) {
          const [, timestamp, method, url, status] = match;
          this.errors.push({
            timestamp,
            method,
            url,
            status: parseInt(status),
            source: 'backend',
            details: line
          });
        }
      }

      // Check for route not found
      const routeMatch = line.match(routePattern);
      if (routeMatch) {
        const [, method, url] = routeMatch;
        const timestamp = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)?.[1] || 'unknown';
        this.errors.push({
          timestamp,
          method,
          url,
          status: 404,
          source: 'backend',
          details: 'Route not found'
        });
      }
    }
  }

  private async analyzeFrontendLogs() {
    const frontendLogPath = path.join(this.tempDir, 'frontend.log');
    if (!fs.existsSync(frontendLogPath)) return;

    const fileStream = fs.createReadStream(frontendLogPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const errorPattern = /(\w+)\s+([^\s]+).*?(\d{3})/;

    for await (const line of rl) {
      if (line.includes('error') || line.includes('Error')) {
        const match = line.match(errorPattern);
        if (match) {
          const [, method, url, status] = match;
          const statusCode = parseInt(status);
          if ([400, 404, 502, 504].includes(statusCode)) {
            this.errors.push({
              timestamp: new Date().toISOString(),
              method,
              url,
              status: statusCode,
              source: 'frontend',
              details: line
            });
          }
        }
      }
    }
  }

  private async analyzeVersions() {
    // Check versions.txt
    const versionsPath = path.join(this.tempDir, 'versions.txt');
    if (fs.existsSync(versionsPath)) {
      const content = fs.readFileSync(versionsPath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const match = line.match(/(.+?):\s*v?(.+)/);
        if (match) {
          this.versions.push({
            file: 'versions.txt',
            name: match[1].trim(),
            version: match[2].trim()
          });
        }
      });
    }

    // Check package.json files
    const checkPackageJson = (dir: string, prefix: string) => {
      const pkgPath = path.join(this.tempDir, dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        this.versions.push({
          file: `${dir}/package.json`,
          name: `${prefix} (${pkg.name})`,
          version: pkg.version
        });

        // Check key dependencies
        const keyDeps = ['next', 'express', 'axios', 'typescript'];
        Object.entries(pkg.dependencies || {}).forEach(([name, version]) => {
          if (keyDeps.includes(name)) {
            this.versions.push({
              file: `${dir}/package.json`,
              name: `${prefix} ${name}`,
              version: version as string
            });
          }
        });
      }
    };

    checkPackageJson('frontend', 'Frontend');
    checkPackageJson('backend', 'Backend');
  }

  private async generateReport() {
    const reportPath = path.join('docs', 'prod-error-report.md');
    
    let report = `# 本番環境エラーレポート

生成日時: ${new Date().toISOString()}
対象ログファイル: ${path.basename(this.tarFile)}

## エラーサマリー

`;

    // Group errors by status code
    const errorsByStatus = this.errors.reduce((acc, err) => {
      if (!acc[err.status]) acc[err.status] = [];
      acc[err.status].push(err);
      return acc;
    }, {} as Record<number, ErrorEntry[]>);

    Object.entries(errorsByStatus).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([status, errors]) => {
      report += `### ${status} エラー (${errors.length}件)\n\n`;
      
      // Group by URL
      const byUrl = errors.reduce((acc, err) => {
        if (!acc[err.url]) acc[err.url] = [];
        acc[err.url].push(err);
        return acc;
      }, {} as Record<string, ErrorEntry[]>);

      Object.entries(byUrl).forEach(([url, urlErrors]) => {
        report += `#### ${url}\n`;
        report += `- 発生回数: ${urlErrors.length}回\n`;
        report += `- メソッド: ${[...new Set(urlErrors.map(e => e.method))].join(', ')}\n`;
        report += `- ソース: ${[...new Set(urlErrors.map(e => e.source))].join(', ')}\n`;
        
        // Show sample timestamp
        if (urlErrors[0].timestamp !== 'unknown') {
          report += `- 最初の発生: ${urlErrors[0].timestamp}\n`;
        }
        
        report += '\n';
      });
    });

    // Add version information
    report += `## バージョン情報

### versions.txt
`;
    const versionsTxt = this.versions.filter(v => v.file === 'versions.txt');
    versionsTxt.forEach(v => {
      report += `- ${v.name}: ${v.version}\n`;
    });

    report += `
### package.json バージョン
`;
    const packageVersions = this.versions.filter(v => v.file.includes('package.json'));
    packageVersions.forEach(v => {
      report += `- ${v.name}: ${v.version}\n`;
    });

    // Add analysis
    report += `
## 分析結果

### 主要な問題

1. **502 Bad Gateway エラー**
   - 原因: バックエンドサービスが起動していない、またはNginxから接続できない
   - 影響: すべてのページでアクセス不可

2. **404 Not Found エラー**
   - 主な原因: APIバージョンの不一致（/api/ vs /api/v1/）
   - 影響を受けるエンドポイント:
`;

    const notFoundErrors = this.errors.filter(e => e.status === 404);
    const uniqueUrls = [...new Set(notFoundErrors.map(e => e.url))];
    uniqueUrls.forEach(url => {
      report += `     - ${url}\n`;
    });

    report += `
### 推奨される対処法

1. **即時対応**
   - サービスの再起動: \`sudo systemctl restart charactier-backend charactier-frontend\`
   - 依存関係の更新: \`npm install\` (両ディレクトリで実行)
   - ビルドの実行: \`npm run build\` (両ディレクトリで実行)

2. **設定確認**
   - .envファイルに \`API_VERSION=v1\` が設定されているか確認
   - Nginx設定が最新か確認

3. **デプロイ手順**
   \`\`\`bash
   git pull origin main
   cd backend && npm install && npm run build
   cd ../frontend && npm install && npm run build
   sudo systemctl restart charactier-backend charactier-frontend
   \`\`\`
`;

    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report generated: ${reportPath}`);
  }

  private cleanup() {
    if (fs.existsSync(this.tempDir)) {
      execSync(`rm -rf ${this.tempDir}`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: ts-node analyzeLogs.ts <tar.gz file>');
    process.exit(1);
  }

  const tarFile = args[0];
  if (!fs.existsSync(tarFile)) {
    console.error(`File not found: ${tarFile}`);
    process.exit(1);
  }

  const analyzer = new LogAnalyzer(tarFile);
  await analyzer.analyze();
}

main().catch(console.error);