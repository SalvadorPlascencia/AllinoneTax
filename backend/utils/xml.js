import { parseStringPromise } from 'xml2js';

export const parseXml = async (xml) => {
  if (!xml) return null;
  return parseStringPromise(xml, {
    explicitArray: false,
    explicitRoot: true,
    tagNameProcessors: [(name) => name.replace('soap:', '').replace('SOAP-ENV:', '')],
  });
};

export const buildSoapEnvelope = ({ header = '', body = '', namespaces = {} }) => {
  const defaultNamespaces = {
    'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
  };
  const mergedNamespaces = { ...defaultNamespaces, ...namespaces };
  const namespaceString = Object.entries(mergedNamespaces)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope ${namespaceString}>
  <soapenv:Header>
    ${header}
  </soapenv:Header>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
};

export const maskValue = (value = '', visible = 2) => {
  if (!value) return '';
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}${'*'.repeat(value.length - visible)}`;
};
