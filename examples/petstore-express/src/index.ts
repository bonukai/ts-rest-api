import express from 'express';
import { generatedRoutes } from '../generated/routes';

const app = express();
const PORT = 8888;

app.use(express.json());
app.use(generatedRoutes);

app.listen(PORT, () => {
  console.log('Listening on', PORT);
});
