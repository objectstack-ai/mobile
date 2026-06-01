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
  },
};

export default serverItem;
