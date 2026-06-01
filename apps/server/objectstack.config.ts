import { defineStack, type ObjectStackDefinition } from '@objectstack/spec';
import { AutomationServicePlugin } from '@objectstack/service-automation';
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

  // Enable the automation engine so flows can be triggered + leave a run log
  // (exposes /api/v1/automation/{name}/trigger and /runs). The plugin seeds the
  // built-in node executors itself (ADR-0018).
  plugins: [new AutomationServicePlugin()],
});

export default stack;
