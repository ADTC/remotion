import type {AudioCodec} from '@remotion/renderer';
import {RenderInternals} from '@remotion/renderer';
import fs from 'fs';
import {existsSync, mkdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import type {CustomCredentials} from '../../shared/aws-clients';
import {
	cleanupSerializedInputProps,
	cleanupSerializedResolvedProps,
} from '../../shared/cleanup-serialized-input-props';
import type {
	PostRenderData,
	Privacy,
	RenderMetadata,
	SerializedInputProps,
} from '../../shared/constants';
import {
	CONCAT_FOLDER_TOKEN,
	encodingProgressKey,
	ENCODING_PROGRESS_STEP_SIZE,
	initalizedMetadataKey,
	rendersPrefix,
} from '../../shared/constants';
import type {DownloadBehavior} from '../../shared/content-disposition-header';
import type {LambdaCodec} from '../../shared/validate-lambda-codec';
import {concatVideosS3, getAllFilesS3} from './concat-videos';
import {createPostRenderData} from './create-post-render-data';
import {cleanupFiles} from './delete-chunks';
import {getCurrentRegionInFunction} from './get-current-region';
import {getFilesToDelete} from './get-files-to-delete';
import {getOutputUrlFromMetadata} from './get-output-url-from-metadata';
import {inspectErrors} from './inspect-errors';
import {lambdaDeleteFile, lambdaLs, lambdaWriteFile} from './io';
import type {EnhancedErrorInfo} from './write-lambda-error';
import {writeLambdaError} from './write-lambda-error';
import {writePostRenderData} from './write-post-render-data';

export type OnAllChunksAvailable = (options: {
	inputProps: SerializedInputProps;
	serializedResolvedProps: SerializedInputProps;
}) => void;

export const mergeChunksAndFinishRender = async (options: {
	bucketName: string;
	renderId: string;
	expectedBucketOwner: string;
	frameCountLength: number;
	codec: LambdaCodec;
	chunkCount: number;
	fps: number;
	numberOfGifLoops: number | null;
	audioCodec: AudioCodec | null;
	renderBucketName: string;
	customCredentials: CustomCredentials | null;
	downloadBehavior: DownloadBehavior;
	key: string;
	privacy: Privacy;
	inputProps: SerializedInputProps;
	verbose: boolean;
	serializedResolvedProps: SerializedInputProps;
	renderMetadata: RenderMetadata;
	onAllChunks: OnAllChunksAvailable;
}): Promise<PostRenderData> => {
	let lastProgressUploaded = 0;

	const onProgress = (framesEncoded: number) => {
		const relativeProgress = framesEncoded / options.frameCountLength;
		const deltaSinceLastProgressUploaded =
			relativeProgress - lastProgressUploaded;

		if (deltaSinceLastProgressUploaded < 0.1) {
			return;
		}

		lastProgressUploaded = relativeProgress;

		lambdaWriteFile({
			bucketName: options.bucketName,
			key: encodingProgressKey(options.renderId),
			body: String(Math.round(framesEncoded / ENCODING_PROGRESS_STEP_SIZE)),
			region: getCurrentRegionInFunction(),
			privacy: 'private',
			expectedBucketOwner: options.expectedBucketOwner,
			downloadBehavior: null,
			customCredentials: null,
		}).catch((err) => {
			writeLambdaError({
				bucketName: options.bucketName,
				errorInfo: {
					chunk: null,
					frame: null,
					isFatal: false,
					name: (err as Error).name,
					message: (err as Error).message,
					stack: `Could not upload stitching progress ${
						(err as Error).stack as string
					}`,
					tmpDir: null,
					type: 'stitcher',
					attempt: 1,
					totalAttempts: 1,
					willRetry: false,
				},
				renderId: options.renderId,
				expectedBucketOwner: options.expectedBucketOwner,
			});
		});
	};

	const onErrors = (errors: EnhancedErrorInfo[]) => {
		RenderInternals.Log.error('Found Errors', errors);

		const firstError = errors[0];
		if (firstError.chunk !== null) {
			throw new Error(
				`Stopping Lambda function because error occurred while rendering chunk ${
					firstError.chunk
				}:\n${errors[0].stack
					.split('\n')
					.map((s) => `   ${s}`)
					.join('\n')}`,
			);
		}

		throw new Error(
			`Stopping Lambda function because error occurred: ${errors[0].stack}`,
		);
	};

	const outdir = join(RenderInternals.tmpDir(CONCAT_FOLDER_TOKEN), 'bucket');
	if (existsSync(outdir)) {
		rmSync(outdir, {
			recursive: true,
		});
	}

	mkdirSync(outdir);

	const files = await getAllFilesS3({
		bucket: options.bucketName,
		expectedFiles: options.chunkCount,
		outdir,
		renderId: options.renderId,
		region: getCurrentRegionInFunction(),
		expectedBucketOwner: options.expectedBucketOwner,
		onErrors,
	});
	options.onAllChunks({
		inputProps: options.inputProps,
		serializedResolvedProps: options.serializedResolvedProps,
	});
	const encodingStart = Date.now();
	const {outfile, cleanupChunksProm} = await concatVideosS3({
		onProgress,
		numberOfFrames: options.frameCountLength,
		codec: options.codec,
		fps: options.fps,
		numberOfGifLoops: options.numberOfGifLoops,
		files,
		outdir,
		audioCodec: options.audioCodec,
	});
	const encodingStop = Date.now();

	const outputSize = fs.statSync(outfile);

	await lambdaWriteFile({
		bucketName: options.renderBucketName,
		key: options.key,
		body: fs.createReadStream(outfile),
		region: getCurrentRegionInFunction(),
		privacy: options.privacy,
		expectedBucketOwner: options.expectedBucketOwner,
		downloadBehavior: options.downloadBehavior,
		customCredentials: options.customCredentials,
	});

	const contents = await lambdaLs({
		bucketName: options.bucketName,
		prefix: rendersPrefix(options.renderId),
		expectedBucketOwner: options.expectedBucketOwner,
		region: getCurrentRegionInFunction(),
	});

	const finalEncodingProgressProm = lambdaWriteFile({
		bucketName: options.bucketName,
		key: encodingProgressKey(options.renderId),
		body: String(
			Math.ceil(options.frameCountLength / ENCODING_PROGRESS_STEP_SIZE),
		),
		region: getCurrentRegionInFunction(),
		privacy: 'private',
		expectedBucketOwner: options.expectedBucketOwner,
		downloadBehavior: null,
		customCredentials: null,
	});

	const errorExplanationsProm = inspectErrors({
		contents,
		renderId: options.renderId,
		bucket: options.bucketName,
		region: getCurrentRegionInFunction(),
		expectedBucketOwner: options.expectedBucketOwner,
	});

	const jobs = getFilesToDelete({
		chunkCount: options.chunkCount,
		renderId: options.renderId,
	});

	const deletProm = options.verbose
		? Promise.resolve(0)
		: cleanupFiles({
				region: getCurrentRegionInFunction(),
				bucket: options.bucketName,
				contents,
				jobs,
		  });

	const cleanupSerializedInputPropsProm = cleanupSerializedInputProps({
		bucketName: options.bucketName,
		region: getCurrentRegionInFunction(),
		serialized: options.inputProps,
	});
	const cleanupResolvedInputPropsProm = cleanupSerializedResolvedProps({
		bucketName: options.bucketName,
		region: getCurrentRegionInFunction(),
		serialized: options.serializedResolvedProps,
	});

	const outputUrl = getOutputUrlFromMetadata(
		options.renderMetadata,
		options.bucketName,
		options.customCredentials,
	);

	const postRenderData = createPostRenderData({
		expectedBucketOwner: options.expectedBucketOwner,
		region: getCurrentRegionInFunction(),
		renderId: options.renderId,
		memorySizeInMb: Number(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE),
		renderMetadata: options.renderMetadata,
		contents,
		errorExplanations: await errorExplanationsProm,
		timeToEncode: encodingStop - encodingStart,
		timeToDelete: (
			await Promise.all([
				deletProm,
				cleanupSerializedInputPropsProm,
				cleanupResolvedInputPropsProm,
			])
		).reduce((a, b) => a + b, 0),
		outputFile: {
			lastModified: Date.now(),
			size: outputSize.size,
			url: outputUrl,
		},
	});

	await finalEncodingProgressProm;
	await writePostRenderData({
		bucketName: options.bucketName,
		expectedBucketOwner: options.expectedBucketOwner,
		postRenderData,
		region: getCurrentRegionInFunction(),
		renderId: options.renderId,
	});
	await lambdaDeleteFile({
		bucketName: options.bucketName,
		key: initalizedMetadataKey(options.renderId),
		region: getCurrentRegionInFunction(),
		customCredentials: null,
	});

	await Promise.all([cleanupChunksProm, fs.promises.rm(outfile)]);
	return postRenderData;
};
