// Include the exporter module
import main from '../../lib/index.js';
// Get the default options
import { initDefaultOptions } from '../../lib/config.js';
// Utility for mapping old format of options to the new one
import { mapToNewConfig, mergeConfigOptions } from '../../lib/utils.js';
import { defaultConfig } from '../../lib/schemas/config.js';

// Export settings with the old options structure (PhantomJS)
// Will be mapped appropriately to the new structure with the mapToNewConfig utility
const exportSettings = {
	type: 'png',
	constr: 'chart',
	async: true, // Will be removed as it is not supported anymore
	logLevel: 1,
	scale: 1,
	options: {
		chart: {
			type: 'column'
		},
		title: {
			text: 'PhantomJS options structure'
		},
		xAxis: {
			categories: ['Jan', 'Feb', 'Mar', 'Apr']
		},
		yAxis: [
			{
				title: {
					text: 'Primary axis'
				}
			},
			{
				opposite: true,
				title: {
					text: 'Secondary axis'
				}
			}
		],
		series: [
			{
				yAxis: 0,
				data: [1, 3, 2, 4]
			},
			{
				yAxis: 1,
				data: [5, 3, 4, 2]
			}
		]
	}
};

const start = async () => {
	// Gather options
	const options = mergeConfigOptions(
		initDefaultOptions(defaultConfig),
		await mapToNewConfig(exportSettings),
		['options']
	);

	// Init a pool for one export
	await main.initPool(options);

	// Perform an export
	main.startExport(options, (info, error) => {
		// Throw an error
		if (error) {
			throw error;
		}

		// Kill the pool
		main.killPool();

		// Display the results
		console.log(info.data);
	});
};

start();
