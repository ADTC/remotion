import {InvokeCommand} from '@aws-sdk/client-lambda';
import {getOrCreateBucket} from '../api/get-or-create-bucket';
import {getLambdaClient} from '../shared/aws-clients';
import {LambdaPayload, LambdaRoutines} from '../shared/constants';
import {randomHash} from '../shared/random-hash';
import {getCurrentRegionInFunction} from './helpers/get-current-region';

export const startHandler = async (params: LambdaPayload) => {
	if (params.type !== LambdaRoutines.start) {
		throw new TypeError('Expected type start');
	}

	if (
		typeof params.enableChunkOptimization !== 'boolean' &&
		typeof params.enableChunkOptimization !== 'undefined'
	) {
		throw new Error(
			'The parameter "enableChunkOptimization" must be a boolean or undefined.'
		);
	}

	if (
		typeof params.saveBrowserLogs !== 'boolean' &&
		typeof params.saveBrowserLogs !== 'undefined'
	) {
		throw new Error(
			'The parameter "saveBrowserLogs" must be a boolean or undefined.'
		);
	}

	const {bucketName} = await getOrCreateBucket({
		region: getCurrentRegionInFunction(),
	});
	const renderId = randomHash();

	const payload: LambdaPayload = {
		type: LambdaRoutines.launch,
		framesPerLambda: params.framesPerLambda,
		composition: params.composition,
		serveUrl: params.serveUrl,
		inputProps: params.inputProps,
		bucketName,
		renderId,
		codec: params.codec,
		imageFormat: params.imageFormat,
		crf: params.crf,
		envVariables: params.envVariables,
		pixelFormat: params.pixelFormat,
		proResProfile: params.proResProfile,
		quality: params.quality,
		maxRetries: params.maxRetries,
		privacy: params.privacy,
		enableChunkOptimization: params.enableChunkOptimization !== false,
		saveBrowserLogs: Boolean(params.saveBrowserLogs),
	};
	await getLambdaClient(getCurrentRegionInFunction()).send(
		new InvokeCommand({
			FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
			// @ts-expect-error
			Payload: JSON.stringify(payload),
			InvocationType: 'Event',
		})
	);
	return {
		bucketName,
		renderId,
	};
};
