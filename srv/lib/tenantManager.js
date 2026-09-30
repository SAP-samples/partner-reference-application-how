'use strict';
const serviceCredentialsUtil = require('./serviceCredentials');
const cds = require('@sap/cds');
const process = require('node:process');

class TenantManager {
  constructor() {
    this.providerTenantID =
      serviceCredentialsUtil.getServiceCredentials('xsuaa')?.tenantid;

    // Ensure that this service is only used in the provider context
    const currentTenantID =
      cds.context?.tenant || process.env['test_tenant_id'];

    if (this.providerTenantID !== currentTenantID) {
      const errorMessage =
        'TenantManager: The tenant context is incorrect. Access denied.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  getProviderTenantId() {
    return this.providerTenantID;
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

  static getSubscriberSubdomain() {
    try {
      // Extract subdomain from the CDS context HTTP request headers
      // The x-forwarded-host header contains the subdomain, e.g. "prahow0371.launchpad.cfapps.eu10.hana.ondemand.com"
      const forwardedHost =
        cds.context?.http?.req?.headers?.['x-forwarded-host'];
      if (forwardedHost) {
        const subdomain = forwardedHost.split('.')[0];
        if (subdomain) {
          return subdomain;
        }
      }

      // Fallback: check tenant_subdomain from CDS context if available
      const tenantSubdomain = cds.context?._.req?.headers?.['tenant_subdomain'];
      if (tenantSubdomain) {
        return tenantSubdomain;
      }

      console.warn('TenantManager: Could not determine subscriber subdomain');
      return;
    } catch (error) {
      console.error('Error determining subscriber subdomain:', error);
      return;
    }
  }
}

module.exports = TenantManager;
