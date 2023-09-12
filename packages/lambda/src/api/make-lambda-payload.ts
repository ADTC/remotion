import type {
	AudioCodec,
	ChromiumOptions,
	ColorSpace,
	FrameRange,
	LogLevel,
	PixelFormat,
	ProResProfile,
	ToOptions,
	VideoImageFormat,
	X264Preset,
} from '@remotion/renderer';
import type {BrowserSafeApis} from '@remotion/renderer/client';
import {VERSION} from 'remotion/version';
import type {AwsRegion, DeleteAfter} from '../client';
import type {
	LambdaStartPayload,
	LambdaStatusPayload,
	OutNameInput,
	Privacy,
	WebhookOption,
} from '../defaults';
import {LambdaRoutines} from '../defaults';
import {
	compressInputProps,
	getNeedsToUpload,
	serializeOrThrow,
} from '../shared/compress-props';
import type {DownloadBehavior} from '../shared/content-disposition-header';
import {validateDownloadBehavior} from '../shared/validate-download-behavior';
import {validateFramesPerLambda} from '../shared/validate-frames-per-lambda';
import type {LambdaCodec} from '../shared/validate-lambda-codec';
import {validateLambdaCodec} from '../shared/validate-lambda-codec';
import {validateServeUrl} from '../shared/validate-serveurl';
import {validateWebhook} from '../shared/validate-webhook';
import type {GetRenderProgressInput} from './get-render-progress';

export type InnerRenderMediaOnLambdaInput = {
	region: AwsRegion;
	functionName: string;
	serveUrl: string;
	composition: string;
	inputProps: Record<string, unknown>;
	codec: LambdaCodec;
	imageFormat: VideoImageFormat;
	crf: number | undefined;
	envVariables: Record<string, string>;
	pixelFormat: PixelFormat | undefined;
	proResProfile: ProResProfile | undefined;
	x264Preset: X264Preset | null;
	privacy: Privacy;
	jpegQuality: number;
	maxRetries: number;
	framesPerLambda: number | null;
	logLevel: LogLevel;
	frameRange: FrameRange | null;
	outName: OutNameInput | null;
	timeoutInMilliseconds: number;
	chromiumOptions: ChromiumOptions;
	scale: number;
	everyNthFrame: number;
	numberOfGifLoops: number | null;
	concurrencyPerLambda: number;
	downloadBehavior: DownloadBehavior;
	muted: boolean;
	overwrite: boolean;
	audioBitrate: string | null;
	videoBitrate: string | null;
	webhook: WebhookOption | null;
	forceWidth: number | null;
	forceHeight: number | null;
	rendererFunctionName: string | null;
	forceBucketName: string | null;
	audioCodec: AudioCodec | null;
	colorSpace: ColorSpace;
	deleteAfter: DeleteAfter | null;
	enableStreaming: boolean;
} & ToOptions<typeof BrowserSafeApis.optionsMap.renderMediaOnLambda>;

export const makeLambdaRenderMediaPayload = async ({
	rendererFunctionName,
	frameRange,
	framesPerLambda,
	forceBucketName: bucketName,
	codec,
	composition,
	serveUrl,
	imageFormat,
	inputProps,
	region,
	crf,
	envVariables,
	pixelFormat,
	proResProfile,
	x264Preset,
	maxRetries,
	privacy,
	logLevel,
	outName,
	timeoutInMilliseconds,
	chromiumOptions,
	scale,
	everyNthFrame,
	numberOfGifLoops,
	audioBitrate,
	concurrencyPerLambda,
	audioCodec,
	forceHeight,
	forceWidth,
	webhook,
	videoBitrate,
	downloadBehavior,
	muted,
	overwrite,
	jpegQuality,
	offthreadVideoCacheSizeInBytes,
	deleteAfter,
	colorSpace,
	enableStreaming,
}: InnerRenderMediaOnLambdaInput): Promise<LambdaStartPayload> => {
	const actualCodec = validateLambdaCodec(codec);
	validateServeUrl(serveUrl);
	validateFramesPerLambda({
		framesPerLambda: framesPerLambda ?? null,
		durationInFrames: 1,
	});
	validateDownloadBehavior(downloadBehavior);
	validateWebhook(webhook);

	const stringifiedInputProps = serializeOrThrow(
		inputProps ?? {},
		'input-props',
	);

	const serialized = await compressInputProps({
		stringifiedInputProps,
		region,
		needsToUpload: getNeedsToUpload('video-or-audio', [
			stringifiedInputProps.length,
		]),
		userSpecifiedBucketName: bucketName ?? null,
		propsType: 'input-props',
	});
	return {
		rendererFunctionName,
		framesPerLambda,
		composition,
		serveUrl,
		inputProps: serialized,
		codec: actualCodec,
		imageFormat,
		crf,
		envVariables,
		pixelFormat,
		proResProfile,
		x264Preset,
		jpegQuality,
		maxRetries,
		privacy,
		logLevel,
		frameRange,
		outName,
		timeoutInMilliseconds,
		chromiumOptions,
		scale,
		everyNthFrame,
		numberOfGifLoops,
		concurrencyPerLambda,
		downloadBehavior,
		muted,
		version: VERSION,
		overwrite,
		audioBitrate,
		videoBitrate,
		webhook,
		forceHeight,
		forceWidth,
		bucketName,
		audioCodec,
		type: LambdaRoutines.start,
		offthreadVideoCacheSizeInBytes,
		deleteAfter,
		colorSpace,
		enableStreaming,
	};
};

export const getRenderProgressPayload = ({
	bucketName,
	renderId,
	s3OutputProvider,
}: GetRenderProgressInput): LambdaStatusPayload => {
	return {
		type: LambdaRoutines.status,
		bucketName,
		renderId,
		version: VERSION,
		s3OutputProvider,
	};
};
