// Cloudflare Pages Function — rota: /api/collect-lead
// Port 1:1 de netlify/functions/collect-lead.js (mesmo contrato de entrada/saída).
// Encaminha o payload do widget para o webhook do n8n conforme ?type=lead|survey|validation.
// Variáveis de ambiente (Cloudflare Pages > Settings > Variables and Secrets):
//   N8N_WEBHOOK_LEAD_URL, N8N_WEBHOOK_SURVEY_URL, N8N_WEBHOOK_VALIDATION_URL

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // widget é embutido em outro domínio (loja WBuy)
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

export async function onRequest(context) {
    const { request, env } = context;

    // --- Preflight (OPTIONS) ---
    if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: CORS_HEADERS });
    }

    // --- Method Not Allowed ---
    if (request.method !== 'POST') {
        return json(405, { error: 'Method Not Allowed' });
    }

    console.log('--- COLLECT LEAD FUNCTION HIT ---');

    try {
        // 1. Tipo (lead vs survey vs validation)
        const type = new URL(request.url).searchParams.get('type') || 'lead';
        let n8nUrl;

        if (type === 'survey') {
            n8nUrl = env.N8N_WEBHOOK_SURVEY_URL;
        } else if (type === 'validation') {
            n8nUrl = env.N8N_WEBHOOK_VALIDATION_URL;
        } else {
            n8nUrl = env.N8N_WEBHOOK_LEAD_URL;
        }

        if (!n8nUrl) {
            console.error(`Missing Environment Variable for type: ${type}`);
            return json(500, { error: 'Server Configuration Error' });
        }

        // 2. Lê o corpo recebido
        const rawBody = await request.text();
        console.log('Event Body:', rawBody);
        const data = JSON.parse(rawBody);

        // 3. Encaminha ao n8n
        const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // 4. Devolve a resposta do n8n
        const n8nData = await response.json();

        if (response.ok) {
            return json(200, n8nData);
        }
        console.error('n8n Error:', response.status, n8nData);
        return json(502, { error: 'Upstream Error', details: n8nData });

    } catch (error) {
        console.error('Error processing request:', error);
        return json(500, { error: 'Internal Server Error' });
    }
}
