import axios from 'axios';
import { config, createIrsHttpsAgent } from '../config.js';
import { buildSoapEnvelope, parseXml } from '../utils/xml.js';

const IRS_NAMESPACE = 'http://www.irs.gov/efile';

const buildAuthBlock = () => `
  <irs:Authentication>
    <irs:Username>${config.irs.username}</irs:Username>
    <irs:Password>${config.irs.password}</irs:Password>
    <irs:TransmitterEFIN>${config.irs.transmitterEfin}</irs:TransmitterEFIN>
    <irs:SoftwareID>${config.irs.softwareId}</irs:SoftwareID>
  </irs:Authentication>
`;

const createSoapHeaders = () => ({
  'Content-Type': 'text/xml; charset=utf-8',
  SOAPAction: 'urn:gov:irs:extd:service:IRSService:SubmitReturn',
});

export const submitReturn = async ({
  transmissionId,
  submissionId,
  taxpayerTin,
  returnXml,
  formFamily = '1040',
}) => {
  if (!returnXml) {
    throw new Error('returnXml is required and should contain a valid IRS-return XML payload.');
  }

  const soapBody = `
    <irs:SubmitReturnRequest xmlns:irs="${IRS_NAMESPACE}">
      ${buildAuthBlock()}
      <irs:TransmissionId>${transmissionId}</irs:TransmissionId>
      <irs:SubmissionId>${submissionId}</irs:SubmissionId>
      <irs:TaxpayerTin>${taxpayerTin}</irs:TaxpayerTin>
      <irs:ReturnType>${formFamily}</irs:ReturnType>
      <irs:ReturnData><![CDATA[${returnXml}]]></irs:ReturnData>
    </irs:SubmitReturnRequest>
  `;

  const soapEnvelope = buildSoapEnvelope({
    header: '',
    body: soapBody,
    namespaces: { 'xmlns:irs': IRS_NAMESPACE },
  });

  const response = await axios.post(config.irs.mefEndpoint, soapEnvelope, {
    httpsAgent: createIrsHttpsAgent(),
    headers: createSoapHeaders(),
    timeout: 30000,
  });

  return {
    raw: response.data,
    acknowledgment: await parseXml(response.data),
  };
};

export const getAcknowledgement = async ({ submissionId }) => {
  if (!submissionId) {
    throw new Error('submissionId is required to fetch an IRS acknowledgement.');
  }

  const soapBody = `
    <irs:GetAcknowledgementRequest xmlns:irs="${IRS_NAMESPACE}">
      ${buildAuthBlock()}
      <irs:SubmissionId>${submissionId}</irs:SubmissionId>
    </irs:GetAcknowledgementRequest>
  `;

  const soapEnvelope = buildSoapEnvelope({
    header: '',
    body: soapBody,
    namespaces: { 'xmlns:irs': IRS_NAMESPACE },
  });

  const response = await axios.post(config.irs.mefEndpoint, soapEnvelope, {
    httpsAgent: createIrsHttpsAgent(),
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:gov:irs:extd:service:IRSService:GetAcknowledgement',
    },
    timeout: 15000,
  });

  return {
    raw: response.data,
    acknowledgment: await parseXml(response.data),
  };
};
