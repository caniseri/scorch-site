import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const appRoot = process.argv[2];
if (!appRoot) throw new Error('Pass the local Catchfire app checkout path. This check is read-only.');
const eas = JSON.parse(await readFile(path.join(appRoot, 'eas.json'), 'utf8'));
const env = eas.build.production.env;
const expected = {
  EXPO_PUBLIC_ENABLE_APPLE_HEALTH_EXPORT: '1',
  EXPO_PUBLIC_ENABLE_HEALTH_CONNECT_EXPORT: '0',
  EXPO_PUBLIC_ENABLE_RACE_FILE_EXPORT: '1',
};
for (const [name, value] of Object.entries(expected)) {
  assert.equal(env[name], value, name + ' changed: review website availability wording and product-scope.json before release.');
}
console.log('Website export availability matches app production configuration. Installed-build distribution is still a separate release gate.');
