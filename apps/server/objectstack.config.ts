import { defineStack } from '@objectstack/spec';
import * as objects from './src/objects';

export default defineStack({
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
