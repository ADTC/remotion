import {RenderInternals} from '@remotion/renderer';
import {chalk} from './chalk';
import {getCliOptions} from './get-cli-options';
import {Log} from './log';

export const GPU_COMMAND = 'gpu';

export const gpuCommand = async (remotionRoot: string) => {
	const {browserExecutable, logLevel, chromiumOptions} = await getCliOptions({
		isLambda: false,
		remotionRoot,
		type: 'get-compositions',
	});

	const statuses = await RenderInternals.getChromiumGpuInformation({
		browserExecutable,
		indent: false,
		logLevel,
		chromiumOptions,
	});
	for (const {feature, status} of statuses) {
		Log.info(`${feature}: ${colorStatus(status)}`);
	}
};

const colorStatus = (status: string) => {
	if (status === 'Enabled') {
		return chalk.green(status);
	}

	if (status === 'Hardware accelerated') {
		return chalk.green(status);
	}

	if (status === 'Disabled') {
		return chalk.red(status);
	}

	if (status === 'Software only. Hardware acceleration disabled') {
		return chalk.red(status);
	}

	if (status === 'Software only, hardware acceleration unavailable') {
		return chalk.red(status);
	}

	return status;
};
