export async function GET() {
  const baseUrl = 'https://charactier-ai.com';
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <!-- ホームページ -->
  <url>
    <loc>${baseUrl}/</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/ja/"/>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/ja/</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/"/>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/en/</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/"/>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- 利用規約 -->
  <url>
    <loc>${baseUrl}/ja/terms</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/terms"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/terms"/>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/en/terms</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/terms"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/terms"/>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- プライバシーポリシー -->
  <url>
    <loc>${baseUrl}/ja/privacy</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/privacy"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/privacy"/>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/en/privacy</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/privacy"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/privacy"/>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- 特定商取引法に基づく表記 -->
  <url>
    <loc>${baseUrl}/ja/legal</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/legal"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/legal"/>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/en/legal</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/legal"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/legal"/>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}