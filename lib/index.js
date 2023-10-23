/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// Add the main directory in the global object
import 'colors';

import server, { start } from './server/server.js';
import chart, { findChartSize } from './chart.js';
import { log, setLogLevel, enableFileLogging } from './logger.js';
import { killAll, init } from './pool.js';
import { initDefaultOptions, loadConfigFile } from './config.js';
import { checkCache } from './cache.js';
import { mergeConfigOptions } from './utils.js';
import { defaultConfig } from './schemas/config.js';

export default {
	server,
	log,
	findChartSize,
	startExport: chart.startExport,
	startServer: start,
	killPool: killAll,
	initPool: async (options = {}) => {
		const defaultOptions = initDefaultOptions(defaultConfig);

		// Load an optional config file
		options = await loadConfigFile(mergeConfigOptions(defaultOptions, options));

		// Set the allowCodeExecution per export module scope
		chart.setAllowCodeExecution(
			options.customCode && options.customCode.allowCodeExecution
		);

		// Set the log level
		setLogLevel(options.logging && parseInt(options.logging.level));

		// Set the log file path and name
		if (options.logging && options.logging.dest) {
			enableFileLogging(
				options.logging.dest,
				options.logging.file || 'highcharts-export-server.log'
			);
		}

		// Check if cache needs to be updated
		await checkCache(options.highcharts || { version: 'latest' });

		// Init the pool
		await init({
			pool: options.pool || {
				initialWorkers: 1,
				maxWorkers: 1
			},
			puppeteerArgs: options.puppeteer?.args || []
		});

		chart.setPoolOptions(options);

		// Return updated options
		return options;
	}
};
