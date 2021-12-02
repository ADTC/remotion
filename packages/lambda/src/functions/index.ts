import {Internals} from 'remotion';
import {
	COMMAND_NOT_FOUND,
	LambdaPayload,
	LambdaRoutines,
} from '../shared/constants';
import {LambdaReturnValues} from '../shared/return-values';
import {fireHandler} from './fire';
import {deleteTmpDir} from './helpers/clean-tmpdir';
import {getWarm, setWarm} from './helpers/is-warm';
import {printCloudwatchHelper} from './helpers/print-cloudwatch-helper';
import {infoHandler} from './info';
import {launchHandler} from './launch';
import {progressHandler} from './progress';
import {rendererHandler} from './renderer';
import {startHandler} from './start';
import {stillHandler} from './still';

export const handler = async <T extends LambdaRoutines>(
	params: LambdaPayload,
	context: {invokedFunctionArn: string}
): Promise<LambdaReturnValues[T]> => {
	if (!context || !context.invokedFunctionArn) {
		throw new Error(
			'Lambda function unexpectedly does not have context.invokedFunctionArn'
		);
	}

	deleteTmpDir();
	const isWarm = getWarm();
	setWarm();

	const currentUserId = context.invokedFunctionArn.split(':')[4];
	if (params.type === LambdaRoutines.still) {
		printCloudwatchHelper(LambdaRoutines.still, {});
		return stillHandler(params, {
			expectedBucketOwner: currentUserId,
		});
	}

	if (params.type === LambdaRoutines.start) {
		printCloudwatchHelper(LambdaRoutines.start, {});
		return startHandler(params);
	}

	if (params.type === LambdaRoutines.launch) {
		printCloudwatchHelper(LambdaRoutines.launch, {
			renderId: params.renderId,
		});
		return launchHandler(params, {expectedBucketOwner: currentUserId});
	}

	if (params.type === LambdaRoutines.status) {
		printCloudwatchHelper(LambdaRoutines.status, {
			renderId: params.renderId,
		});
		return progressHandler(params, {expectedBucketOwner: currentUserId});
	}

	if (params.type === LambdaRoutines.fire) {
		printCloudwatchHelper(LambdaRoutines.fire, {
			renderId: params.renderId,
		});
		return fireHandler(params);
	}

	if (params.type === LambdaRoutines.renderer) {
		printCloudwatchHelper(LambdaRoutines.renderer, {
			renderId: params.renderId,
			chunk: String(params.chunk),
			dumpLogs: String(
				Internals.Logging.isEqualOrBelowLogLevel(params.logLevel, 'verbose')
			),
		});
		return rendererHandler(params, {
			expectedBucketOwner: currentUserId,
			isWarm,
		});
	}

	if (params.type === LambdaRoutines.info) {
		printCloudwatchHelper(LambdaRoutines.info, {});

		return infoHandler(params);
	}

	throw new Error(COMMAND_NOT_FOUND);
};
