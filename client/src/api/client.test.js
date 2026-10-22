import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import api from './client';

let server;
let origin;
let receivedContentType = '';

beforeAll(async () => {
  server = createServer((request, response) => {
    receivedContentType = request.headers['content-type'] || '';
    request.resume();
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    });
    response.end(JSON.stringify({ success: true, data: {}, message: 'ok' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('API client', () => {
  it('lets the browser set the multipart boundary for image uploads', async () => {
    const form = new FormData();
    form.append('image', new Blob(['image-bytes'], { type: 'image/png' }), 'image.png');

    await api.post(`${origin}/upload`, form, { withCredentials: false });

    expect(receivedContentType).toMatch(/^multipart\/form-data; boundary=/);
  });
});
