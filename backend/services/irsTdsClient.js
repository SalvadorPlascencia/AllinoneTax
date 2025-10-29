import axios from 'axios';
import { config, createIrsHttpsAgent } from '../config.js';
import { buildSoapEnvelope, parseXml } from '../utils/xml.js';

const TDS_NAMESPACE = 'http://www.irs.gov/efile';

const buildTdsAuthBlock = () => `
  <irs:Authentication>
    <irs:Username>${config.irs.username}</irs:Username>
    <irs:Password>${config.irs.password}</irs:Password>
    <irs:OrganizationId>${config.irs.tdsOrganizationId}</irs:OrganizationId>
  </irs:Authentication>
`;

export const requestTranscript = async ({
  taxpayerTin,
  taxpayerNameControl,
  transcriptType = 'RTFTP',
  taxPeriod,
}) => {
  if (!taxpayerTin) {
    throw new Error('taxpayerTin is required for transcript requests.');
  }
  if (!taxPeriod) {
    throw new Error('taxPeriod (YYYYMM) is required for transcript requests.');
  }

  const soapBody = `
    <irs:GetTranscriptRequest xmlns:irs="${TDS_NAMESPACE}">
      ${buildTdsAuthBlock()}
      <irs:TaxpayerIdentificationNumber>${taxpayerTin}</irs:TaxpayerIdentificationNumber>
      ${taxpayerNameControl ? `<irs:TaxpayerNameControl>${taxpayerNameControl}</irs:TaxpayerNameControl>` : ''}
      <irs:TranscriptType>${transcriptType}</irs:TranscriptType>
      <irs:TaxPeriod>${taxPeriod}</irs:TaxPeriod>
    </irs:GetTranscriptRequest>
  `;

  const soapEnvelope = buildSoapEnvelope({
    header: '',
    body: soapBody,
    namespaces: { 'xmlns:irs': TDS_NAMESPACE },
  });

  const response = await axios.post(config.irs.tdsEndpoint, soapEnvelope, {
    httpsAgent: createIrsHttpsAgent(),
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:gov:irs:extd:service:IRSService:GetTranscript',
    },
    responseType: 'text',
    timeout: 20000,
  });

  return {
    raw: response.data,
    transcript: await parseXml(response.data),
  };
};
