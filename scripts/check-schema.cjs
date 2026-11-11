const fs = require('fs');
const { getDMMF } = require('@prisma/internals');
getDMMF({ datamodel: fs.readFileSync('prisma/schema.prisma', 'utf8') })
  .then((d) => console.log(`Validated ${d.datamodel.models.length} Prisma models.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
