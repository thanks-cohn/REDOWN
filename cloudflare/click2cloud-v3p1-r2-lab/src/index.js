// Isolated REDOWN V3+1 deployment smoke target.
// This is NOT the production Chrome V3 engine or its R2 transfer Worker.
// Deliberately no R2 bindings, secrets, upload routes, or browser-side credentials.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/_lab/health') {
      return new Response(JSON.stringify({
        service: 'click2cloud-v3p1-r2-lab',
        purpose: 'isolated-deployment-smoke-only',
        cloudTransferReady: false,
      }), { headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      } });
    }
    return new Response('Not found', { status: 404 });
  },
};
