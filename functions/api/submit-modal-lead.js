// Cloudflare Pages Function — rota: /api/submit-modal-lead
// Port 1:1 de netlify/functions/submit-modal-lead.js (mesmo contrato de entrada/saída).
// Variáveis: N8N_WEBHOOK_LP_WD_INJ, N8N_WEBHOOK_LP_WD_INT_QUIZ

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
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

    if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
        return json(405, { error: 'Method Not Allowed' });
    }

    try {
        const type = new URL(request.url).searchParams.get('type') || 'contact';
        const n8nUrl = type === 'quiz' ? env.N8N_WEBHOOK_LP_WD_INT_QUIZ : env.N8N_WEBHOOK_LP_WD_INJ;

        if (!n8nUrl) {
            console.error(`Missing Environment Variable for type: ${type}`);
            return json(500, { error: 'Server Configuration Error: Missing Webhook URL' });
        }

        const data = JSON.parse(await request.text());

        const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            return json(200, { message: 'Success' });
        }
        console.error('n8n Error:', response.status, await response.text());
        return json(502, { error: 'Upstream Error' });

    } catch (error) {
        console.error('Error processing request:', error);
        return json(500, { error: 'Internal Server Error' });
    }
}
