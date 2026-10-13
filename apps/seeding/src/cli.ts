import yargs from 'yargs';
import { download } from './commands/download';
import { validate } from './commands/validate';
import { seed } from './commands/seed';
import { scrape } from './commands/scrape';
import { upload } from './commands/upload';
import { SeedMode } from './scraping/generate-seed';
import fs from 'fs';
import yaml, { YAMLException } from 'js-yaml';
import { defaultLogger, getElapsedTime, MessageType } from './services/logger';
import { SerializedMarketplace } from './models/serialized-marketplace';
import * as SeedingTemplates from '../seeds/meta.json';
import _ from 'lodash';

yargs.scriptName("@ordercloud/seeding")
  .usage('$0 <cmd> [args] -')
  .command('seed [data]', 'Create a new sandbox marketplace and seed data.', (yargs) => {
    yargs.positional('data', {
      type: 'string',
      alias: 'd',
      default: 'ordercloud-seed.yml',
      describe: 'Local file name or HTTP(S) link'
    });
    yargs.option('username', {
      type: 'string',
      alias: 'u',
      describe: 'Portal username'
    })
    yargs.option('password', {
      type: 'string',
      alias: 'p',
      describe: 'Portal password'
    })
    yargs.option('id', {
      type: 'string',
      alias: 'i',
      describe: 'Marketplace ID'
    }),
    yargs.option('name', {
      type: 'string',
      alias: 'n',
      describe: 'Marketplace Name'
    }),
    yargs.option('regionId', {
      type: 'string',
      alias: 'r',
      describe: 'Region for the marketplace. See the API docs for more information'
    })
  }, function (argv) {
    var dataUrl = argv.d as string;
    // Check for short-cut aliases
    var template = SeedingTemplates.templates.find(x => x.name === dataUrl);
    if (!_.isNil(template)) {
        dataUrl = template.dataUrl;
    }

    var stringData;
    if (!dataUrl.startsWith('http')) {
      try {
        stringData = fs.readFileSync(dataUrl, 'utf8') // consider switching to streams
        defaultLogger(`Found file \"${dataUrl}\"`, MessageType.Success);
      } catch (err) {
          defaultLogger(`No such file \"${dataUrl}\" found`, MessageType.Error);
          return;
      }
      try {
        var data = yaml.load(stringData) as SerializedMarketplace;
        seed({
          username: argv.u as string,
          password: argv.p as string,
          marketplaceID: argv.i as string,
          marketplaceName: argv.n as string,
          regionId: argv.r as string,
          rawData: data
        });
        return;
      } catch (e) {
        var ex = e as YAMLException;
        defaultLogger(`YAML Exception in \"${dataUrl}\": ${ex.message}`, MessageType.Error)
        return;
      }
    }
    seed({
      username: argv.u as string,
      password: argv.p as string,
      marketplaceID: argv.i as string,
      marketplaceName: argv.n as string,
      regionId: argv.r as string,
      dataUrl: dataUrl as string
    });
  })
  .command('download [filePath]', 'Create a local seed file from an existing marketplace.', (yargs) => {
    yargs.option('id', {
      type: 'string',
      alias: 'i',
      describe: 'Marketplace ID'
    }),
    yargs.option('username', {
      type: 'string',
      alias: 'u',
      describe: 'Portal username'
    })
    yargs.option('password', {
      type: 'string',
      alias: 'p',
      describe: 'Portal password'
    })
    yargs.positional('fileName', {
      type: 'string',
      alias: 'f',
      default: 'ordercloud-seed.yml',
      describe: 'File name'
    })
  }, async function (argv) {
    var startTime = Date.now();
    var data = await download({
      username: argv.u as string,
      password: argv.p as string,
      marketplaceID: argv.i as string, 
    });
    if (data) {
      var path = argv.f as string ?? 'ordercloud-seed.yml';
      fs.writeFileSync(path, yaml.dump(data));
      var endTime = Date.now();
      defaultLogger(`Wrote to file ${path}. Total elapsed time: ${getElapsedTime(startTime, endTime)}`, MessageType.Done);
    }
  })
  .command('validate [data]', 'Validate a potential data source for seeding.', (yargs) => {
    yargs.positional('data', {
      type: 'string',
      alias: 'd',
      default: 'ordercloud-seed.yml',
      describe: 'Local file path or HTTP(S) link'
    })
  }, async function (argv) {
    var filePath = argv.d as string;
    var stringData;
    if (!filePath.startsWith('http')) {
      try {
        stringData = fs.readFileSync(filePath, 'utf8') // consider switching to streams
        defaultLogger(`Found file \"${filePath}\".`, MessageType.Success);
      } catch (err) {
          return defaultLogger(`No such file \"${filePath}\" found`, MessageType.Error);
      }
      try {
        var data = yaml.load(stringData) as SerializedMarketplace;
        await validate({ rawData: data })
        return defaultLogger(`Validation done!`, MessageType.Done);
      } catch (e) {
        var ex = e as YAMLException;
        return defaultLogger(`YAML Exception in \"${filePath}\": ${ex.message}`, MessageType.Error)
      }
    }
    await validate({ dataUrl: argv.d as string });
    defaultLogger(`Validation done!`, MessageType.Done);
  })
  .command('scrape <url>', 'Scrape a product listing page into a seed file (downloads images).', (yargs) => {
    yargs.positional('url', {
      type: 'string',
      describe: 'Public product listing page URL'
    });
    yargs.option('site', {
      type: 'string',
      alias: 's',
      describe: 'Site parser id (default: auto-detect from hostname)'
    });
    yargs.option('out', {
      type: 'string',
      alias: 'o',
      describe: 'Output YAML path (default: output/products/<site>-products.yml)'
    });
    yargs.option('image-base-url', {
      type: 'string',
      describe: 'Base URL the images will be hosted at (overrides PRODUCT_IMAGE_BASE_URL)'
    });
    yargs.option('catalog-id', {
      type: 'string',
      describe: 'Catalog the products are assigned to (default: scraped-<site>-products)'
    });
    yargs.option('mode', {
      type: 'string',
      alias: 'm',
      choices: ['complete', 'fragment'],
      default: 'complete',
      describe: 'complete = scaffold + products (seedable on its own); fragment = products only'
    });
    yargs.option('scaffold', {
      type: 'string',
      describe: 'Base seed file to overlay products onto in --mode=complete (default: bundled Simple-B2C)'
    });
    yargs.option('limit', {
      type: 'number',
      alias: 'l',
      default: 100,
      describe: 'Max number of products to scrape (use 0 for no limit)'
    });
    yargs.option('images', {
      type: 'boolean',
      default: true,
      describe: 'Download images (pass --no-images to skip; YAML still references the base URL paths)'
    });
  }, async function (argv) {
    await scrape({
      url: argv.url as string,
      site: argv.site as string,
      out: argv.out as string,
      imageBaseUrl: argv['image-base-url'] as string,
      catalogId: argv['catalog-id'] as string,
      mode: argv.mode as SeedMode,
      scaffoldPath: argv.scaffold as string,
      limit: argv.limit as number,
      // yargs exposes --no-images as argv.images === false
      noImages: argv.images === false
    });
  })
  .command('upload <file>', 'Upload a seed YAML into an existing marketplace using client credentials.', (yargs) => {
    yargs.positional('file', {
      type: 'string',
      describe: 'Path to the seed YAML file to upload'
    });
    yargs.option('client-id', {
      type: 'string',
      describe: 'API client ID (or set OC_CLIENT_ID / OC_MIDDLEWARE_CLIENT_ID in .env.local)'
    });
    yargs.option('client-secret', {
      type: 'string',
      describe: 'API client secret (or set OC_CLIENT_SECRET / OC_MIDDLEWARE_CLIENT_SECRET in .env.local)'
    });
    yargs.option('api-url', {
      type: 'string',
      describe: 'OrderCloud base API URL, e.g. https://sandboxapi.ordercloud.io (or set OC_API_URL in .env.local)'
    });
    yargs.option('marketplace-id', {
      type: 'string',
      describe: 'Your seller org / marketplace ID (or set OC_MARKETPLACE_ID in .env.local)'
    });
    yargs.option('supplier-id', {
      type: 'string',
      describe: 'Supplier ID to associate products with (or set OC_SUPPLIER_ID in .env.local; default: <source>-supplier derived from filename)'
    });
  }, async function (argv) {
    await upload({
      filePath: argv.file as string,
      clientId: argv['client-id'] as string,
      clientSecret: argv['client-secret'] as string,
      apiUrl: argv['api-url'] as string,
      marketplaceId: argv['marketplace-id'] as string,
      supplierId: argv['supplier-id'] as string,
    });
  })
  .help()
  .argv
