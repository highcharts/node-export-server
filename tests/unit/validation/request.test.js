import { describe } from '@jest/globals';

import { configTests } from './shared.js';
import { RequestSchema } from '../../../lib/validate.js';

// Return config tests with a specific schema and strictCheck flag injected
const tests = configTests(RequestSchema.partial(), false);

describe('Request body configuration options should be correctly parsed and validated', () => {
  // export.infile
  tests.exportInstr('infile');

  // export.options
  tests.exportOptions('options');

  // export.data
  tests.exportOptions('data');

  // payload.svg
  tests.payloadSvg('svg');

  // export.type
  tests.exportType(
    'type',
    ['jpeg', 'jpg', 'png', 'pdf', 'svg'],
    ['json', 'txt']
  );

  // export.constr
  tests.exportConstr(
    'constr',
    ['chart', 'stockChart', 'mapChart', 'ganttChart'],
    ['stock', 'map', 'gantt']
  );

  // export.height
  tests.exportHeight('height');

  // export.width
  tests.exportWidth('width');

  // export.scale
  tests.exportScale('scale');

  // export.globalOptions
  tests.exportGlobalOptions('globalOptions');

  // export.themeOptions
  tests.exportThemeOptions('themeOptions');

  // export.resources
  tests.customLogicResources('resources');

  // export.callback
  tests.customLogicCallback('callback');

  // export.customCode
  tests.customLogicCustomCode('customCode');

  // payload.b64
  tests.payloadB64('b64');

  // payload.noDownload
  tests.payloadNoDownload('noDownload');
});
