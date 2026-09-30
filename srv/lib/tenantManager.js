'use strict';

const cds = require('@sap/cds');
const process = require('node:process');

class TenantManager {
  constructor() {}

  getProviderTenantId() {
    return this.providerTenantID;
  }

  async getSubscriberSubdomain() {
    try {
      // Ensure that this service is only used in the provider context
      const currentTenantID =
        cds.context?.tenant || process.env['test_tenant_id'];

      if (!currentTenantID) {
        return;
      }

      const ssp = await cds.connect.to('cds.xt.SaasProvisioningService');
      const allTenants = await ssp.get('/tenant');

      // Filter out the provider tenant
      const subscribedTenant = allTenants.find(
        (tenant) => tenant.subscribedTenantId === currentTenantID
      );
      return subscribedTenant.subscribedSubdomain;
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw new Error('Failed to retrieve tenants', { cause: error });
    }
  }

  async getSubscriberTenantIds() {
    try {
      const ssp = await cds.connect.to('cds.xt.SaasProvisioningService');
      const allTenants = await ssp.get('/tenant');

      // Filter out the provider tenant
      const subscribedTenants = allTenants.filter(
        (tenant) => tenant.subscribedTenantId !== this.providerTenantID
      );
      return subscribedTenants;
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw new Error('Failed to retrieve tenants', { cause: error });
    }
  }
}

module.exports = TenantManager;
