import Fastify from 'fastify';

const server = Fastify({ logger: true });
const port = Number(process.env.PORT || 4300);
const host = process.env.HOST || '0.0.0.0';
const slug = 'calculator';

server.get(`/api/${slug}/health/`, async () => ({
  ok: true,
  app: slug
}));

server.post(`/api/${slug}/sync/`, async () => ({
  schemaVersion: 1,
  serverVersion: 0,
  ackedOperationIds: [],
  rejectedOperations: [],
  state: {},
  serverTimestamp: new Date().toISOString()
}));

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
