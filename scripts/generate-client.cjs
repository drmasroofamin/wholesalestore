// Use Prisma's packaged WASM schema parser and JS query compiler. No native
// engine downloads or integrity-check overrides are needed for client generation.
const { getGenerators } = require('@prisma/internals');
(async () => {
  const generators = await getGenerators({
    schemaPath: 'prisma/schema.prisma',
    skipDownload: true,
    registry: {
      'prisma-client-js': {
        type: 'rpc',
        generatorPath: require.resolve('@prisma/client/generator-build'),
        isNode: true,
      },
    },
  });
  try {
    for (const g of generators) await g.generate();
    console.log('Prisma client generated with JavaScript query compiler.');
  } finally {
    for (const g of generators) g.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
