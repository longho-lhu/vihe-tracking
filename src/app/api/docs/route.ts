import { swaggerSpec } from '@/lib/swagger'

export async function GET() {
  const spec = JSON.stringify(swaggerSpec)

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VehiTrack - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0f1e;
      font-family: 'Inter', -apple-system, sans-serif;
      min-height: 100vh;
    }

    /* Top bar */
    .top-bar {
      background: linear-gradient(135deg, #0f1629 0%, #131d35 100%);
      border-bottom: 1px solid rgba(99,120,179,0.2);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .top-bar-logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .top-bar-title { font-size: 1rem; font-weight: 700; color: #e8edf8; }
    .top-bar-sub { font-size: 0.75rem; color: #8b97b8; margin-left: auto; }
    .top-bar a {
      color: #60a5fa; font-size: 0.8125rem; text-decoration: none;
      border: 1px solid rgba(59,130,246,0.3); border-radius: 8px;
      padding: 0.375rem 0.75rem;
      transition: all 0.2s;
    }
    .top-bar a:hover { background: rgba(59,130,246,0.15); }

    #swagger-ui { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

    /* Override Swagger UI dark theme */
    .swagger-ui { color: #e8edf8; }
    .swagger-ui .info .title { color: #e8edf8; font-size: 2rem; }
    .swagger-ui .info p, .swagger-ui .info li { color: #8b97b8; }
    .swagger-ui .info a { color: #60a5fa; }
    .swagger-ui .scheme-container {
      background: #0f1629;
      box-shadow: none;
      border: 1px solid rgba(99,120,179,0.2);
      border-radius: 12px;
      padding: 1rem;
    }
    .swagger-ui .opblock-tag {
      color: #e8edf8;
      border-bottom: 1px solid rgba(99,120,179,0.2);
      font-size: 1rem;
    }
    .swagger-ui .opblock-tag:hover { background: rgba(59,130,246,0.05); border-radius: 8px; }
    .swagger-ui .opblock {
      background: #131d35;
      border: 1px solid rgba(99,120,179,0.2) !important;
      border-radius: 10px;
      margin-bottom: 0.5rem;
      box-shadow: none;
    }
    .swagger-ui .opblock.opblock-get { border-left: 3px solid #10b981 !important; }
    .swagger-ui .opblock.opblock-post { border-left: 3px solid #3b82f6 !important; }
    .swagger-ui .opblock.opblock-patch { border-left: 3px solid #f59e0b !important; }
    .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444 !important; }
    .swagger-ui .opblock .opblock-summary { border: none; }
    .swagger-ui .opblock .opblock-summary-description { color: #8b97b8; }
    .swagger-ui .opblock-body { background: #0f1629; border-radius: 0 0 10px 10px; }
    .swagger-ui .opblock-description-wrapper p { color: #8b97b8; }
    .swagger-ui .tab li { color: #8b97b8; }
    .swagger-ui .tab li.active { color: #60a5fa; }
    .swagger-ui .parameter__name { color: #e8edf8; }
    .swagger-ui .parameter__type { color: #a5b4fc; }
    .swagger-ui .parameter__deprecated { color: #ef4444; }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #8b97b8; border-bottom: 1px solid rgba(99,120,179,0.2); }
    .swagger-ui .response-col_status { color: #e8edf8; }
    .swagger-ui .response-col_description { color: #8b97b8; }
    .swagger-ui .model-box { background: #0f1629; border-radius: 8px; }
    .swagger-ui .model { color: #e8edf8; }
    .swagger-ui .model-title { color: #a5b4fc; }
    .swagger-ui section.models {
      background: #0f1629;
      border: 1px solid rgba(99,120,179,0.2);
      border-radius: 12px;
    }
    .swagger-ui section.models h4 { color: #e8edf8; }
    .swagger-ui .btn {
      background: #131d35;
      border: 1px solid rgba(99,120,179,0.3);
      color: #e8edf8;
      border-radius: 8px;
    }
    .swagger-ui .btn:hover { background: #1a2644; }
    .swagger-ui .btn.execute {
      background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
      border: none !important;
      color: white !important;
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .swagger-ui .btn.cancel { border-color: rgba(239,68,68,0.3); color: #fca5a5; }
    .swagger-ui input[type=text],
    .swagger-ui input[type=password],
    .swagger-ui input[type=search],
    .swagger-ui input[type=email],
    .swagger-ui textarea,
    .swagger-ui select {
      background: #0f1629 !important;
      border: 1px solid rgba(99,120,179,0.3) !important;
      color: #e8edf8 !important;
      border-radius: 8px !important;
    }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .response-control-media-type__accept-message { color: #8b97b8; }
    .swagger-ui .highlight-code { background: #0a0f1e; border-radius: 8px; }
    .swagger-ui .highlight-code pre { color: #e8edf8; }
    .swagger-ui .prop-type { color: #34d399; }
    .swagger-ui .prop-format { color: #a5b4fc; }
    .swagger-ui .renderedMarkdown p { color: #8b97b8; }
    .swagger-ui .authorization__btn svg { fill: #8b97b8; }
    .swagger-ui .auth-container { background: #131d35; border: 1px solid rgba(99,120,179,0.2); border-radius: 12px; }
    .swagger-ui .auth-container h4 { color: #e8edf8; }
    .swagger-ui .scopes h2 { color: #e8edf8; }
    .swagger-ui .dialog-ux .modal-ux { background: #131d35; border: 1px solid rgba(99,120,179,0.3); border-radius: 16px; }
    .swagger-ui .dialog-ux .modal-ux-header { background: #0f1629; border-radius: 16px 16px 0 0; border-bottom: 1px solid rgba(99,120,179,0.2); }
    .swagger-ui .dialog-ux .modal-ux-header h3 { color: #e8edf8; }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="top-bar-logo">📡</div>
    <div>
      <div class="top-bar-title">VehiTrack API Documentation</div>
    </div>
    <span class="top-bar-sub">OpenAPI 3.0</span>
    <a href="/api/swagger.json" download="vehi-api.json">⬇ Tải OpenAPI JSON</a>
    <a href="/" style="margin-left: 0.5rem">← Dashboard</a>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        spec: ${spec},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        filter: true,
        tryItOutEnabled: true,
      })
    }
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
