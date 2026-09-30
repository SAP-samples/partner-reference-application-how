'use strict';

// const cds = require('@sap/cds');

// Add connector for project management systems
const ConnectorS4HC = require('./connector/connectorS4HC');

module.exports = async (srv) => {
  const { S4HCProjects } = srv.entities;
  // -------------------------------------------------------------------------------------------------
  // Implementation of remote OData services (back-channel integration with SAP S/4HANA Cloud)
  // -------------------------------------------------------------------------------------------------

  // Delegate OData requests to SAP S/4HANA Cloud remote project entities
  srv.on('READ', S4HCProjects, async (req) => {
    const connector = await ConnectorS4HC.createConnectorInstance(req);
    return await connector.delegateODataRequests(
      req,
      ConnectorS4HC.PROJECT_SERVICE
    );
  });
};
