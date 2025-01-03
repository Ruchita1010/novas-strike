import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';

const app = express();
const server = http.createServer(app);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
