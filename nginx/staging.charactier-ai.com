server {
    listen 80;
    server_name staging.charactier-ai.com;
    
    # Let's Encryptの認証用
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # HTTPSへリダイレクト
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name staging.charactier-ai.com;
    
    # SSL証明書（後で設定）
    # ssl_certificate /etc/letsencrypt/live/staging.charactier-ai.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/staging.charactier-ai.com/privkey.pem;
    
    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    
    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # フロントエンドへのプロキシ
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # APIへのプロキシ
    location /api/v1/ {
        proxy_pass http://localhost:5100/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静的ファイル
    location /_next/static {
        proxy_pass http://localhost:3100;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}