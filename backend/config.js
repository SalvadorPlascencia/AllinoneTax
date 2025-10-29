import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const backendEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

const requiredFile = (label, filePath) => {
  if (!filePath) {
    throw new Error(`${label} is not configured. Set the environment variable before starting the server.`);
  }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} file not found at ${resolved}. Verify the path is correct and readable by the server.`);
  }
  return resolved;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? 4000,
  clientOrigin: process.env.CLIENT_ORIGIN,
  irs: {
    mefEndpoint: process.env.IRS_MEF_ENDPOINT,
    transmitterEfin: process.env.IRS_MEF_TRANSMITTER_EFIN,
    softwareId: process.env.IRS_MEF_SOFTWARE_ID,
    username: process.env.IRS_MEF_USERNAME,
    password: process.env.IRS_MEF_PASSWORD,
    tdsEndpoint: process.env.IRS_TDS_ENDPOINT,
    tdsOrganizationId: process.env.IRS_TDS_ORGANIZATION_ID,
    clientCertPath: process.env.IRS_CLIENT_CERT_PATH,
    clientKeyPath: process.env.IRS_CLIENT_KEY_PATH,
    caBundlePath: process.env.IRS_CA_BUNDLE_PATH,
  },
};

export const verifyIrsCredentials = () => {
  const missing = [];
  if (!config.irs.mefEndpoint) missing.push('IRS_MEF_ENDPOINT');
  if (!config.irs.transmitterEfin) missing.push('IRS_MEF_TRANSMITTER_EFIN');
  if (!config.irs.softwareId) missing.push('IRS_MEF_SOFTWARE_ID');
  if (!config.irs.username) missing.push('IRS_MEF_USERNAME');
  if (!config.irs.password) missing.push('IRS_MEF_PASSWORD');
  if (!config.irs.tdsEndpoint) missing.push('IRS_TDS_ENDPOINT');
  if (!config.irs.tdsOrganizationId) missing.push('IRS_TDS_ORGANIZATION_ID');
  if (!config.irs.clientCertPath) missing.push('IRS_CLIENT_CERT_PATH');
  if (!config.irs.clientKeyPath) missing.push('IRS_CLIENT_KEY_PATH');
  if (missing.length) {
    throw new Error(`Missing IRS integration configuration values: ${missing.join(', ')}`);
  }
  const certPath = requiredFile('IRS client certificate', config.irs.clientCertPath);
  const keyPath = requiredFile('IRS client private key', config.irs.clientKeyPath);
  const caPath = config.irs.caBundlePath ? requiredFile('IRS certificate authority bundle', config.irs.caBundlePath) : undefined;
  return {
    certPath,
    keyPath,
    caPath,
  };
};

export const createIrsHttpsAgent = () => {
  const { certPath, keyPath, caPath } = verifyIrsCredentials();
  return new https.Agent({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    ca: caPath ? fs.readFileSync(caPath) : undefined,
    rejectUnauthorized: true,
    keepAlive: true,
  });
};
