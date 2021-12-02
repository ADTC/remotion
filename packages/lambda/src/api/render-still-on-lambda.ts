import {LogLevel, StillImageFormat} from 'remotion';
import {AwsRegion} from '../pricing/aws-regions';
import {callLambda} from '../shared/call-lambda';
import {DEFAULT_MAX_RETRIES, LambdaRoutines} from '../shared/constants';
/**
 * @description Renders a still frame on Lambda
 * @link https://remotion-lambda-alpha.netlify.app/docs/lambda/renderstillonlambda
 * @param params.functionName The name of the Lambda function that should be used
 * @param params.serveUrl The URL of the deployed project
 * @param params.composition The ID of the composition which should be rendered.
 * @param params.inputProps The input props that should be passed to the composition.
 * @param params.imageFormat In which image format the frames should be rendered.
 * @param params.envVariables Object containing environment variables to be inserted into the video environment
 * @param params.quality JPEG quality if JPEG was selected as the image format.
 * @param params.region The AWS region in which the video should be rendered.
 * @param params.maxRetries How often rendering a chunk may fail before the video render gets aborted.
 * @param params.frame Which frame should be used for the still image. Default 0.
 * @param params.privacy Whether the item in the S3 bucket should be public. Possible values: `"private"` and `"public"`
 * @returns `Promise<{estimatedPrice: CostsInfo; url: string; size: number}>`
 */

export const renderStillOnLambda = async ({
	functionName,
	serveUrl,
	inputProps,
	imageFormat,
	envVariables,
	quality,
	region,
	maxRetries,
	composition,
	privacy,
	frame,
	logLevel,
}: {
	region: AwsRegion;
	functionName: string;
	serveUrl: string;
	composition: string;
	inputProps: unknown;
	imageFormat: StillImageFormat;
	privacy: 'private' | 'public';
	maxRetries?: number;
	envVariables?: Record<string, string>;
	quality?: number;
	frame?: number;
	logLevel?: LogLevel;
}) => {
	const res = await callLambda({
		functionName,
		type: LambdaRoutines.still,
		payload: {
			composition,
			serveUrl,
			inputProps,
			imageFormat,
			envVariables,
			quality,
			maxRetries: maxRetries ?? DEFAULT_MAX_RETRIES,
			frame: frame ?? 0,
			privacy,
			attempt: 1,
			logLevel,
		},
		region,
	});
	return {
		estimatedPrice: res.estimatedPrice,
		url: res.output,
		size: res.size,
		bucketName: res.bucketName,
		renderId: res.renderId,
	};
};
