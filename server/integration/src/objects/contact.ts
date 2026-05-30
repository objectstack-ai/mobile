import * as Data from "@objectstack/spec/data";

/**
 * Contact — a minimal CRM person object related to {@link account}.
 * Used by the mobile app's server integration tests.
 */
const contact: Data.ServiceObjectInput = {
  name: "crm_contact",
  label: "Contact",
  fields: {
    first_name: {
      type: "text",
      label: "First Name",
      required: true,
    },
    last_name: {
      type: "text",
      label: "Last Name",
    },
    email: {
      type: "email",
      label: "Email",
    },
    account: {
      type: "lookup",
      label: "Account",
      reference: "crm_account",
    },
  },
};

export default contact;
