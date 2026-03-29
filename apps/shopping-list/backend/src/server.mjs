import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildShoppingListServer } from './app.mjs';

const port = Number(process.env.PORT || 4300);
const host = process.env.HOST || '0.0.0.0';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRootDir = path.resolve(currentDir, '../..');
const databasePath = path.join(appRootDir, 'data', 'shopping-list.sqlite');

const server = buildShoppingListServer({
  databasePath,
  logger: true
});

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
