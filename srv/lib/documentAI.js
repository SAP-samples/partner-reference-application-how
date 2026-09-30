'use strict';
const process = require('node:process');
const { Buffer } = require('node:buffer');

const { setTimeout } = require('timers');
// Implementation of SAP Document AI reuse functions
// Wraps the SAP Document AI API for uploading files, creating documents,
// polling extraction status, and retrieving extracted entities.

// Generated OpenAPI interfaces
const {
  DocumentServiceApi,
  SchemaServiceApi
} = require('../external/DOCUMENTAIAPI');

const FormData = require('form-data');

// Reuse functions to access service credentials
const serviceCredentials = require('./serviceCredentials');

const SERVICE_NAME = 'sap-document-information-extraction';
const API_BASE_PATH = '/document-ai/v1';

/**
 * DocumentAI class for interacting with SAP Document AI service.
 * Implements session-based credential caching with multitenancy support.
 */
class DocumentAI {
  /**
   * Creates a DocumentAI instance
   * @param {object} req - The CAP request object (used to derive tenant context)
   */
  constructor(req) {
    this.req = req;
  }

  /**
   * Gets credentials, using session cache first, then tenant cache, then fetching fresh.
   * This ensures tokens are reused within a session and across requests for the same tenant.
   * @returns {Promise<{credentials: object, accessToken: string, apiBaseUrl: string}>}
   * @private
   */
  async _getCredentials() {
    const tenantId = this.req?.tenant || cds.context?.tenant || null;

    // Fetch credentials and token
    const credentials = serviceCredentials.getServiceCredentials(SERVICE_NAME);
    if (!credentials) {
      throw new Error(
        `DocumentAI: Missing binding credentials for service "${SERVICE_NAME}"`
      );
    }

    // Get access token - pass true for isConsumerSpecific for tenant-specific tokens
    const accessToken = await serviceCredentials.getServiceToken(
      SERVICE_NAME,
      tenantId,
      true // isConsumerSpecific - Document AI uses tenant-specific context
    );

    const apiBaseUrl = credentials?.url + API_BASE_PATH;

    const credentialsData = { credentials, accessToken, apiBaseUrl };

    return credentialsData;
  }

  /**
   * Uploads a file to Document AI as multipart/form-data.
   * Returns { ID, status } from the response.
   * @param {Buffer|string} fileContent - File content (Buffer or base64 string)
   * @param {string} mimeType - MIME type of the file
   * @param {string} fileName - Name of the file
   * @returns {Promise<{ID: string, status: string}>}
   */
  async uploadFile(fileContent, mimeType, fileName) {
    try {
      const { credentials, accessToken } = await this._getCredentials();

      // fileContent arrives as a base64 string (LargeBinary / Edm.Binary) — decode to Buffer
      const fileBuffer = Buffer.isBuffer(fileContent)
        ? fileContent
        : Buffer.from(fileContent, 'base64');

      // Use FormData for multipart upload - the Document AI API expects 'file' as the field name
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName || 'upload.pdf',
        contentType: mimeType || 'application/pdf'
      });
      formData.append('ocrEngine', 'Document');

      // Use the http-client directly for multipart/form-data upload
      // Access via module reference to allow sinon stubbing in tests
      const httpClient = require('@sap-cloud-sdk/http-client');

      const response = await httpClient.executeHttpRequest(
        { url: credentials?.url },
        {
          method: 'POST',
          url: `${API_BASE_PATH}/FileService/Files/Upload`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...formData.getHeaders()
          },
          data: formData
        }
      );

      return {
        ID: response?.data?.ID,
        status: response?.data?.status
      };
    } catch (error) {
      console.error(
        `An error occurred while uploading file to Document AI: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Polls the document status until it is 'confirmed' or 'failed'.
   * @param {string} documentAIDocID - The document ID to poll
   * @returns {Promise<void>}
   */
  async pollDocumentStatus(documentAIDocID) {
    const intervalMs = parseInt(
      process.env.DOCUMENT_AI_POLL_INTERVAL_MS || '2000',
      10
    );
    const timeoutMs = parseInt(
      process.env.DOCUMENT_AI_POLL_TIMEOUT_MS || '30000',
      10
    );

    const start = Date.now();

    while (true) {
      if (Date.now() - start >= timeoutMs) {
        throw new Error('DOCUMENTAI_PROCESSING_TIMEOUT');
      }

      try {
        // Reuse credentials within the polling loop
        const { accessToken, apiBaseUrl } = await this._getCredentials();

        const response = await DocumentServiceApi.getDocumentServiceDocumentsId(
          documentAIDocID
        )
          .addCustomHeaders({ Authorization: `Bearer ${accessToken}` })
          .execute({ url: apiBaseUrl });

        const status = response?.status;
        console.log(
          `Document AI: documentAIDocID=${documentAIDocID} status=${status}`
        );

        if (status === 'confirmed' || status === 'reviewNeeded') {
          return;
        }
        if (status === 'failed') {
          throw new Error('DOCUMENTAI_PROCESSING_FAILED');
        }
      } catch (error) {
        console.error(
          `An error occurred while polling Document AI document status: ${error.message}`
        );
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Retrieves the entities of the first version of the document.
   * @param {string} documentAIDocID - The document ID
   * @returns {Promise<Array>} Array of extracted entities
   */
  async getExtractedEntities(documentAIDocID) {
    try {
      const { accessToken, apiBaseUrl } = await this._getCredentials();

      const response =
        await DocumentServiceApi.getDocumentServiceDocumentsIdVersions(
          documentAIDocID,
          { $expand: 'entities' }
        )
          .addCustomHeaders({ Authorization: `Bearer ${accessToken}` })
          .execute({ url: apiBaseUrl });

      const versions = response?.value;
      if (!Array.isArray(versions) || versions.length === 0) {
        return [];
      }
      const entities = versions[0]?.entities;
      if (!Array.isArray(entities)) {
        return [];
      }
      return entities;
    } catch (error) {
      console.error(
        `An error occurred while reading Document AI entities: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Parses Document AI entities into visitor objects.
   * Normalize: Map field entities into flat key-value rows.
   * Group structure: each row has a unique parent_ID.
   * Table structure: rows share a parent_ID but differ by occurrence.
   * @param {Array} entities - Array of entity objects from Document AI
   * @returns {Array<{name: string, email: string, artistIndicator: boolean}>}
   */
  parseEntitiesToVisitors(entities) {
    const rows = new Map();
    for (const entity of entities) {
      if (entity?.type === 'Group' || entity?.type === 'Table') continue;
      if (entity?.type !== 'Field' && entity?.parent_ID == null) continue;

      const key =
        entity.occurrence != null
          ? `${entity.parent_ID}_${entity.occurrence}`
          : entity.parent_ID;

      if (!rows.has(key)) rows.set(key, {});
      // If available, process stringValue. If not, use the rawValue.
      rows.get(key)[entity.name] = entity.stringValue ?? entity.rawValue;
    }

    const visitors = [];
    for (const row of rows.values()) {
      if (!row.email) {
        console.warn(
          `Document AI: Skipping person with missing email (name=${row.name ?? row.visitorName})`
        );
        continue;
      }
      visitors.push({
        name: row.name ?? row.visitorName,
        email: row.email,
        // Valid values indicating boolean value 'true'
        artistIndicator: [
          'true',
          '1',
          'yes',
          'x',
          '✓',
          'checked',
          'selected',
          'on'
        ].includes(
          String(row.artistIndicator ?? row.isArtist ?? '')
            .trim()
            .toLowerCase()
        )
      });
    }
    return visitors;
  }

  /**
   * Retrieves the active schema version and executes it against a file.
   * Combines schema lookup and execution into a single operation.
   * @param {string} fileId - The file ID to process
   * @param {string} [schemaName='PSM_EXTRACT_VISITORS'] - The schema name to look up
   * @returns {Promise<string>} The document ID from the extraction
   */
  async applySchema(fileId, schemaName = 'PSM_EXTRACT_VISITORS') {
    try {
      const { accessToken, apiBaseUrl } = await this._getCredentials();

      // Step 1: Retrieve the schema and find the active version
      const schemaResponse = await SchemaServiceApi.getSchemaServiceSchemas({
        $filter: `name eq '${schemaName}'`,
        $expand: 'versions'
      })
        .addCustomHeaders({ Authorization: `Bearer ${accessToken}` })
        .execute({ url: apiBaseUrl });

      const schema = schemaResponse?.value?.[0];
      if (!schema) {
        throw new Error(`DOCUMENTAI_SCHEMA_NOT_FOUND: ${schemaName}`);
      }

      const activeVersion = schema.versions?.find(
        (version) => version.isActive === true
      );
      if (!activeVersion) {
        throw new Error(`DOCUMENTAI_NO_ACTIVE_SCHEMA_VERSION: ${schemaName}`);
      }

      // Step 2: Execute the schema version with the file
      const executeResponse =
        await SchemaServiceApi.createSchemaServiceSchemaVersionsIdSchemaServiceExecute(
          activeVersion.ID,
          { fileId }
        )
          .addCustomHeaders({ Authorization: `Bearer ${accessToken}` })
          .execute({ url: apiBaseUrl });

      return executeResponse.execute.documentId;
    } catch (error) {
      console.error(
        `An error occurred while applying schema '${schemaName}' to file '${fileId}': ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Orchestrates: uploadFile -> applySchema -> pollDocumentStatus
   * Returns the document ID for further processing.
   * @param {Buffer|string} fileContent - File content (Buffer or base64 string)
   * @param {string} mimeType - MIME type of the file
   * @param {string} fileName - Name of the file
   * @returns {Promise<string>} The document ID
   */
  async extractGuestList(fileContent, mimeType, fileName) {
    const uploadResult = await this.uploadFile(fileContent, mimeType, fileName);
    const documentAIDocID = await this.applySchema(uploadResult?.ID);
    await this.pollDocumentStatus(documentAIDocID);
    return documentAIDocID;
  }

  /**
   * Builds the Document AI URL for a given document ID.
   * Uses the request context from the instance to derive the subdomain.
   * @param {string} documentAIDocID - The Document AI document ID
   * @returns {string} The Document AI URL
   */
  buildDocumentAIUrl(documentAIDocID) {
    const credentials = serviceCredentials.getServiceCredentials(SERVICE_NAME);

    const subdomain =
      this.req?.http?.req?.authInfo?.getSubdomain() || 'test-subdomain';
    const host = credentials?.url?.replace(/^https?:\/\//, '');

    return `https://${subdomain}.${host}/workspace#/Documents(${documentAIDocID})`;
  }
}

// Export the token cache for testing purposes
module.exports = DocumentAI;
