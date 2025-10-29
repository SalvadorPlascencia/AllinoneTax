import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { config } from './config.js';
import { submitReturn, getAcknowledgement } from './services/irsMefClient.js';
import { requestTranscript } from './services/irsTdsClient.js';
import { maskValue } from './utils/xml.js';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(
  cors({
    origin: config.clientOrigin || '*',
    credentials: true,
  }),
);
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

const buildErrorPayload = (error) => {
  if (error.response) {
    return {
      status: error.response.status,
      statusText: error.response.statusText,
      body: typeof error.response.data === 'string' ? error.response.data.slice(0, 2000) : error.response.data,
    };
  }
  return {
    message: error.message,
  };
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env });
});

app.post('/api/mef/returns', async (req, res) => {
  try {
    const payload = await submitReturn(req.body);
    res.json(payload);
  } catch (error) {
    console.error('[IRS:SubmitReturn]', error);
    res.status(error.response?.status ?? 500).json({
      error: 'Failed to submit return to IRS MeF.',
      details: buildErrorPayload(error),
    });
  }
});

app.get('/api/mef/returns/:submissionId/acknowledgement', async (req, res) => {
  try {
    const payload = await getAcknowledgement({ submissionId: req.params.submissionId });
    res.json(payload);
  } catch (error) {
    console.error('[IRS:GetAcknowledgement]', error);
    res.status(error.response?.status ?? 500).json({
      error: 'Failed to retrieve acknowledgement from IRS MeF.',
      details: buildErrorPayload(error),
    });
  }
});

app.post('/api/tds/transcripts', async (req, res) => {
  try {
    const payload = await requestTranscript(req.body);
    if (req.body.taxpayerTin) {
      console.info('[IRS:TDS] Transcript requested for', maskValue(req.body.taxpayerTin));
    }
    res.json(payload);
  } catch (error) {
    console.error('[IRS:GetTranscript]', error);
    res.status(error.response?.status ?? 500).json({
      error: 'Failed to retrieve transcript from IRS TDS.',
      details: buildErrorPayload(error),
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

const start = () => {
  app.listen(config.port, () => {
    console.log(`IRS integration server listening on port ${config.port}`);
  });
};

start();
