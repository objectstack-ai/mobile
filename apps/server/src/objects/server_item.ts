import * as Data from '@objectstack/spec/data';

const serverItem: Data.ServiceObjectInput = {
  name: 'server_item',
  label: 'Server Item',
  fields: {
    name: {
      type: 'text',
      label: 'Name',
      required: true,
    },
    description: {
      type: 'textarea',
      label: 'Description',
    },
    status: {
      type: 'select',
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'draft',
    },
    // Conditional fields (ObjectStack 8.0): the mobile form/detail renderers
    // evaluate these live against the record's values. See
    // `lib/conditional-fields.ts`.
    archived_reason: {
      type: 'textarea',
      label: 'Archived Reason',
      // Only shown — and only required — once the item is archived.
      visibleWhen: "status == 'archived'",
      requiredWhen: "status == 'archived'",
    },
    locked: {
      type: 'boolean',
      label: 'Locked',
      defaultValue: false,
    },
    name_locked_note: {
      type: 'text',
      label: 'Lock Note',
      // Editable until the record is locked.
      readonlyWhen: 'locked == true',
    },
  },
};

export default serverItem;
