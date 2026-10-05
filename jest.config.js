import path from 'path';
import jcs from '@folio/jest-config-stripes';

const { config } = jcs;

export default {
  ...config,
  testEnvironment: path.join(import.meta.dirname, 'test/jest/jsdomWithFetch.js'),
};
