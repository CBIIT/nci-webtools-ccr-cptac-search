const fs = require("fs");
const fsp = require("fs/promises");
const { readFileAsIterable, importTable, getTimestamp } = require("./utils");
const sqlite = require("better-sqlite3");
const incrstdev = require("@stdlib/stats/incr/stdev");
const wilcoxon = require("@stdlib/stats/wilcoxon");
const ttest2 = require("@stdlib/stats/ttest2");
const { zip } = require("lodash");
const sources = require("./sources.json");
const args = require("minimist")(process.argv.slice(2));
const timestamp = getTimestamp(
  ([absolute, relative]) => `${absolute / 1000}s, ${relative / 1000}s`,
);

(async function main() {
  const databaseFilePath = args.db || "data.db";

  const mainTablesSql = await fsp.readFile("schema/tables/main.sql", "utf-8");
  const mainIndexesSql = await fsp.readFile("schema/indexes/main.sql", "utf-8");

  // recreate database
  if (fs.existsSync(databaseFilePath)) fs.unlinkSync(databaseFilePath);

  const database = sqlite(databaseFilePath);
  const nanToNull = (value) => (isNaN(value) ? null : value);
  database.exec(mainTablesSql);

  // define functions
  database.function(
    "extract",
    (string, delimiter, index) => string.split(delimiter)[index],
  );
  database.function("sqrt", (v) => nanToNull(Math.sqrt(v)));
  database.aggregate("stdev", {
    start: () => incrstdev(),
    step: (accumulator, value) => {
      accumulator(value);
    },
    result: (accumulator) => nanToNull(accumulator()),
  });
  database.aggregate("median", {
    start: () => [],
    step: (values, value) => {
      values.push(value);
    },
    result: (values) => {
      values.sort();
      const midpoint = (values.length - 1) / 2;
      const ceilValue = +values[Math.ceil(midpoint)];
      const floorValue = +values[Math.floor(midpoint)];
      return nanToNull((ceilValue + floorValue) / 2);
    },
  });
  database.aggregate("wilcoxon", {
    start: () => ({ x: [], y: [] }),
    step: ({ x, y }, xValue, yValue) => {
      if (xValue !== null && yValue !== null) {
        x.push(xValue);
        y.push(yValue);
      }
    },
    result: ({ x, y }) =>
      x.length > 1 && zip(x, y).some(([x, y]) => x - y !== 0)
        ? nanToNull(wilcoxon(x, y).pValue)
        : null,
  });
  database.aggregate("ttest2", {
    start: () => ({ x: [], y: [] }),
    step: ({ x, y }, xValue, yValue) => {
      if (xValue !== null) x.push(xValue);
      if (yValue !== null) y.push(yValue);
    },
    result: ({ x, y }) =>
      x.length > 1 && y.length > 1 ? nanToNull(ttest2(x, y).pValue) : null,
  });

  // import sources
  for (const { filePath, table, headers } of sources) {
    console.log(`[${timestamp()}] started importing ${table}`);
    const rows = readFileAsIterable(filePath, headers);
    await importTable(database, table, headers, rows);
    console.log(`[${timestamp()}] finished importing ${table}`);
  }

  // create indexes
  console.log(`[${timestamp()}] started generating indexes`);
  database.exec(mainIndexesSql);
  console.log(`[${timestamp()}] finished generating indexes`);

  for (const [dataTable, dataSummaryTable] of [
    ["proteinData", "proteinDataSummary"],
    ["phosphoproteinData", "phosphoproteinDataSummary"],
    ["rnaData", "rnaDataSummary"],
    ["tcgaRnaData", "tcgaRnaDataSummary"],
  ]) {
    // insert normal values
    console.log(
      `[${timestamp()}] started generating normal sample statistics: ${dataSummaryTable}`,
    );
    database.exec(
      `insert into "${dataSummaryTable}" (
          geneId,
          cancerId,
          normalSampleCount,
          normalSampleMean,
          normalSampleMedian,
          normalSampleStandardError
      )
      select
          geneId,
          cancerId,
          count(normalValue) as normalSampleCount,
          avg(normalValue) as normalSampleMean,
          median(normalValue) as normalSampleMedian,
          stdev(normalValue) / sqrt(count(normalValue))
      from "${dataTable}"
      where normalValue is not null
      group by cancerId, geneId
      on conflict("cancerId", "geneId") do update set
          "normalSampleCount" = excluded."normalSampleCount",
          "normalSampleMean" = excluded."normalSampleMean",
          "normalSampleMedian" = excluded."normalSampleMedian",
          "normalSampleStandardError" = excluded."normalSampleStandardError"`,
    );
    console.log(
      `[${timestamp()}] finished generating normal sample statistics: ${dataSummaryTable}`,
    );

    console.log(
      `[${timestamp()}] finished generating tumor sample statistics: ${dataSummaryTable}`,
    );
    database.exec(
      `insert into "${dataSummaryTable}" (
          cancerId,
          geneId,
          tumorSampleCount,
          tumorSampleMean,
          tumorSampleMedian,
          tumorSampleStandardError
      )
      select
          cancerId,
          geneId,
          count(tumorValue) as tumorSampleCount,
          avg(tumorValue) as tumorSampleMean,
          median(tumorValue) as tumorSampleMedian,
          stdev(tumorValue) / sqrt(count(tumorValue)) as tumorSampleStandardError
      from "${dataTable}"
      where tumorValue is not null
      group by cancerId, geneId
      on conflict("cancerId", "geneId") do update set
          "tumorSampleCount" = excluded."tumorSampleCount",
          "tumorSampleMean" = excluded."tumorSampleMean",
          "tumorSampleMedian" = excluded."tumorSampleMedian",
          "tumorSampleStandardError" = excluded."tumorSampleStandardError"`,
    );
    console.log(
      `[${timestamp()}] finished generating tumor sample statistics: ${dataSummaryTable}`,
    );

    console.log(
      `[${timestamp()}] started generating p-values: ${dataSummaryTable}`,
    );
    database.exec(
      `insert into "${dataSummaryTable}" (
        cancerId,
        geneId,
        pValuePaired,
        pValueUnpaired
      )
      select
          cancerId,
          geneId,
          wilcoxon(normalValue, tumorValue) as pValuePaired,
          ttest2(normalValue, tumorValue) as pValueUnpaired
      from "${dataTable}"
      group by cancerId, geneId
      on conflict("cancerId", "geneId") do update set
        "pValuePaired" = excluded."pValuePaired",
        "pValueUnpaired" = excluded."pValueUnpaired"`,
    );
    console.log(
      `[${timestamp()}] finished generating p-values: ${dataSummaryTable}`,
    );
  }

  database.close();
})();
