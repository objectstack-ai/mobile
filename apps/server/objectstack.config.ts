import { defineStack, type ObjectStackDefinition } from '@objectstack/spec';
import * as objects from './src/objects';

const stack: ObjectStackDefinition = defineStack({
  manifest: {
    id: 'com.example.server',
    namespace: 'server',
    version: '0.1.0',
    type: 'app',
    name: 'Server',
    description: 'Server application built with ObjectStack',
  },

  objects: Object.values(objects),
});

export default stack;
