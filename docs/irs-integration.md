# IRS Modernized e-File (MeF) & Transcript Delivery System (TDS) Integration

This guide explains how the new backend scaffolding under `backend/` connects All In One Tax & Permits to the IRS Modernized e-File and Transcript Delivery System services.

## 1. Prerequisites

- **IRS e-Services account** with MeF and TDS access for your firm.
- **Transmitter Control Code (TCC)** and **Electronic Filing Identification Number (EFIN)** authorized for the target filing types.
- **IRS-issued production and test PKI certificates** (key pair and chain).
- **IRS-approved software ID** or a newly requested ID tied to All In One Tax & Permits.
- **Secure workstation or server** running Node.js 18+ with outbound connectivity to IRS endpoints.
- **Operational security controls**: hardware security module or encrypted file storage for certificates, centralized logging, and SOC/IR plan.

## 2. Local Setup

```bash
cd backend
npm install
cp .env.example .env
```

Populate `.env` with:

- Endpoint URLs for the IRS environment (test or production).
- Credentials (username/password, transmitter EFIN, software ID, organization ID).
- Absolute file paths to the PKI assets.

> CAUTION: **Never commit `.env` or certificate files.** Store secrets in a vault (e.g., Azure Key Vault, AWS Secrets Manager) when deploying.

Start the development server after configuration:

```bash
npm run dev
```

The service listens on `PORT` (defaults to `4000`) and exposes JSON routes.

## 3. Available Endpoints

| Route | Method | Purpose | Body |
| --- | --- | --- | --- |
| `/api/mef/returns` | POST | Submits a return package to MeF | `transmissionId`, `submissionId`, `taxpayerTin`, `returnXml`, `formFamily` |
| `/api/mef/returns/:submissionId/acknowledgement` | GET | Retrieves acknowledgement data for a submission | Path param `submissionId` |
| `/api/tds/transcripts` | POST | Requests taxpayer transcript via TDS | `taxpayerTin`, `taxpayerNameControl?`, `transcriptType`, `taxPeriod` |

The handlers return the raw SOAP response (`raw`) plus a parsed JSON representation (`acknowledgment` / `transcript`). The parsed structure depends on the IRS envelope; verify against published XML schemas.

## 4. Building XML Payloads

- `returnXml` should be a complete 1040/1120/etc. XML document that already satisfies the IRS schema. The scaffold wraps it in a SOAP envelope.
- MeF submissions typically require compression and signature blocks; extend `submitReturn` with the required `<irs:Attachment>` elements and binary attachments per Publication 4164.
- Transcript requests accept transcript type codes such as `RTFTP` (Return Transcript), `RTFRT` (Record of Account), etc. Reference the TDS user guide for valid values.

Consider creating an internal serializer that:

1. Validates taxpayer identification numbers and names.
2. Applies IRS XML schemas (XSD validation).
3. Digitally signs payloads when required.

## 5. Security Considerations

- Load certificates from a secrets manager or disk encrypted at rest. The current helper (`createIrsHttpsAgent`) reads PEM files on each call; replace with HSM-backed agents in production.
- Trim logs to avoid sensitive data. The server masks TINs in console output via `maskValue`.
- Ensure TLS 1.2+ outbound connectivity and restrict IP traffic to IRS endpoints.
- Maintain audit logs for submissions and acknowledgements per IRS Safeguards requirements.

## 6. Next Steps

1. **Schema validation**: integrate IRS-provided XSDs and reject payloads that fail validation before transmission.
2. **Return packaging**: add utilities for building binary attachments and zipped return bundles.
3. **Persistence**: store submission IDs, acknowledgements, and transcript artifacts in a secure database (SQL/NoSQL).
4. **Back-office UI**: build internal dashboards to trigger submissions and view ack/transcript history.
5. **Error handling**: map IRS fault codes to user-friendly messages and retry policies.
6. **Continuous testing**: use the IRS ATS (Assurance Testing System) environment before production go-live.

## 7. Deployment Tips

- Run the backend behind an API gateway with mutual TLS and web application firewall rules.
- Configure CI/CD to inject secrets from a vault and run integration tests against the IRS test endpoints.
- Monitor for IRS outage notifications and build alerting for non-200 responses or timeouts.

