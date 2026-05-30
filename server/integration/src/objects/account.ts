import * as Data from "@objectstack/spec/data";

/**
 * Account — a minimal CRM company object used by the mobile app's
 * server integration tests (`__tests__/integration/server`).
 */
const account: Data.ServiceObjectInput = {
  name: "crm_account",
  label: "Account",
  fields: {
    name: {
      type: "text",
      label: "Name",
      required: true,
    },
    industry: {
      type: "text",
      label: "Industry",
    },
    website: {
      type: "url",
      label: "Website",
    },
  },
};

export default account;
