import fs from 'fs';
import exporter from '../../lib/index.js';

console.log('Running node tests...');

const getDirectories = async () =>
  (await fs.promises.readdir('./tests/visual', { withFileTypes: true }))
    .filter((file) => file.isDirectory())
    .map((file) => file.name);

const getFiles = async (directory) =>
  (await fs.promises.readdir(directory, { withFileTypes: true }))
    .filter((file) => file.isFile())
    .map((file) => file.name);

const readJsonFile = async (filePath) =>
  JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

const initExporter = async () => {
  await exporter.initExport(exporter.setOptions());
  exporter.setLogLevel(4);
};

const runSingleExport = async (options) => {
  return new Promise((resolve) =>
    exporter.startExport(options, async (error, info) => {
      console.log('callback()');
      if (error) throw error;

      await fs.promises.writeFile(
        info.options.export.outfile,
        info.options?.export?.type !== 'svg'
          ? Buffer.from(info.result, 'base64')
          : info.result
      );

      resolve();
    })
  );
};

(async () => {
  console.log(await getDirectories());
  console.log(await getFiles('./tests/visual/allow_code_execution'));

  const options = await readJsonFile(
    './tests/visual/allow_code_execution/config.json'
  );

  options.export.outfile = './tests/visual/allow_code_execution/generated.png';

  await initExporter();
  await runSingleExport(options);
  await exporter.killPool();
})();
