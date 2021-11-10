import {InvokeCommand} from '@aws-sdk/client-lambda';
import {
	renderFrames,
	RenderInternals,
	stitchFramesToVideo,
} from '@remotion/renderer';
import {BrowserLog} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
import {getLambdaClient} from '../shared/aws-clients';
import {
	chunkKeyForIndex,
	DOWNLOADS_DIR,
	lambdaInitializedKey,
	LambdaPayload,
	LambdaPayloads,
	LambdaRoutines,
	lambdaTimingsKey,
	OUTPUT_PATH_PREFIX,
	RENDERER_PATH_TOKEN,
} from '../shared/constants';
import {getFileExtensionFromCodec} from '../shared/get-file-extension-from-codec';
import {randomHash} from '../shared/random-hash';
import {tmpDir} from '../shared/tmpdir';
import {
	ChunkTimingData,
	ObjectChunkTimingData,
} from './chunk-optimization/types';
import {deletedFiles, deletedFilesSize} from './helpers/clean-tmpdir';
import {closeBrowser, getBrowserInstance} from './helpers/get-browser-instance';
import {getCurrentRegionInFunction} from './helpers/get-current-region';
import {getFolderFiles} from './helpers/get-files-in-folder';
import {getFolderSizeRecursively} from './helpers/get-folder-size';
import {lambdaWriteFile} from './helpers/io';
import {timer} from './helpers/timer';
import {uploadBrowserLogs} from './helpers/upload-browser-logs';
import {
	getTmpDirStateIfENoSp,
	writeLambdaError,
} from './helpers/write-lambda-error';

type Options = {
	expectedBucketOwner: string;
	isWarm: boolean;
};

const renderHandler = async (
	params: LambdaPayload,
	options: Options,
	logs: BrowserLog[]
) => {
	if (params.type !== LambdaRoutines.renderer) {
		throw new Error('Params must be renderer');
	}

	const browserInstance = await getBrowserInstance();
	const outputPath = OUTPUT_PATH_PREFIX + randomHash();
	if (fs.existsSync(outputPath)) {
		(fs.rmSync ?? fs.rmdirSync)(outputPath);
	}

	fs.mkdirSync(outputPath);

	if (typeof params.chunk !== 'number') {
		throw new Error('must pass chunk');
	}

	if (!params.frameRange) {
		throw new Error('must pass framerange');
	}

	const start = Date.now();
	const chunkTimingData: ObjectChunkTimingData = {
		timings: {},
		chunk: params.chunk,
		frameRange: params.frameRange,
		startDate: start,
	};
	const {assetsInfo} = await renderFrames({
		config: {
			id: params.composition,
			durationInFrames: params.durationInFrames,
			fps: params.fps,
			height: params.height,
			width: params.width,
		},
		imageFormat: params.imageFormat,
		inputProps: params.inputProps,
		frameRange: params.frameRange,
		onFrameUpdate: (i: number, output: string, frameNumber: number) => {
			chunkTimingData.timings[frameNumber] = Date.now() - start;
		},
		parallelism: 1,
		onStart: () => {
			lambdaWriteFile({
				privacy: 'private',
				bucketName: params.bucketName,
				body: JSON.stringify({
					filesCleaned: deletedFilesSize,
					filesInTmp: fs.readdirSync('/tmp'),
					isWarm: options.isWarm,
					deletedFiles,
					tmpSize: getFolderSizeRecursively('/tmp'),
					tmpDirFiles: getFolderFiles('/tmp'),
				}),
				key: lambdaInitializedKey({
					renderId: params.renderId,
					chunk: params.chunk,
				}),
				region: getCurrentRegionInFunction(),
				expectedBucketOwner: options.expectedBucketOwner,
			});
		},
		outputDir: outputPath,
		puppeteerInstance: browserInstance,
		serveUrl: params.serveUrl,
		quality: params.quality,
		envVariables: params.envVariables,
		browser: 'chrome',
		dumpBrowserLogs: false,
		onBrowserLog: (log) => {
			logs.push(log);
		},
	});
	const outdir = tmpDir(RENDERER_PATH_TOKEN);

	const outputLocation = path.join(
		outdir,
		`localchunk-${String(params.chunk).padStart(
			8,
			'0'
		)}.${getFileExtensionFromCodec(params.codec, 'chunk')}`
	);

	const stitchLabel = timer('stitcher');
	if (!fs.existsSync(DOWNLOADS_DIR)) {
		fs.mkdirSync(DOWNLOADS_DIR);
	}

	const endRendered = Date.now();

	await stitchFramesToVideo({
		assetsInfo: {
			...assetsInfo,
			// Make all assets remote
			assets: assetsInfo.assets.map((asset) => {
				return asset.map((a) => {
					return {
						...a,
						isRemote: true,
					};
				});
			}),
		},
		downloadDir: DOWNLOADS_DIR,
		dir: outputPath,
		force: true,
		fps: params.fps,
		height: params.height,
		width: params.width,
		outputLocation,
		codec: params.codec,
		imageFormat: params.imageFormat,
		crf: params.crf,
		pixelFormat: params.pixelFormat,
		proResProfile: params.proResProfile,
		parallelism: 1,
		verbose: false,
		onProgress: () => {
			// TODO: upload progress from time to time
		},
		webpackBundle: null,
	});
	stitchLabel.end();
	await RenderInternals.addSilentAudioIfNecessary(outputLocation);
	const endStitching = Date.now();

	const condensedTimingData: ChunkTimingData = {
		...chunkTimingData,
		timings: Object.values(chunkTimingData.timings),
	};

	await lambdaWriteFile({
		bucketName: params.bucketName,
		key: chunkKeyForIndex({
			renderId: params.renderId,
			index: params.chunk,
		}),
		body: fs.createReadStream(outputLocation),
		region: getCurrentRegionInFunction(),
		privacy: params.privacy,
		expectedBucketOwner: options.expectedBucketOwner,
	});
	await Promise.all([
		fs.promises.rm(outputLocation, {recursive: true}),
		fs.promises.rm(outputPath, {recursive: true}),
		lambdaWriteFile({
			bucketName: params.bucketName,
			body: JSON.stringify(condensedTimingData as ChunkTimingData, null, 2),
			key: `${lambdaTimingsKey({
				renderId: params.renderId,
				chunk: params.chunk,
				encoded: endStitching,
				rendered: endRendered,
				start,
			})}`,
			region: getCurrentRegionInFunction(),
			privacy: 'private',
			expectedBucketOwner: options.expectedBucketOwner,
		}),
	]);
};

export const rendererHandler = async (
	params: LambdaPayload,
	options: Options
) => {
	if (params.type !== LambdaRoutines.renderer) {
		throw new Error('Params must be renderer');
	}

	const logs: BrowserLog[] = [];

	try {
		await renderHandler(params, options, logs);
	} catch (err) {
		// If this error is encountered, we can just retry as it
		// is a very rare error to occur
		const isBrowserError =
			(err as Error).message.includes('FATAL:zygote_communication_linux.cc') ||
			(err as Error).message.includes(
				'error while loading shared libraries: libnss3.so'
			);
		const willRetry = isBrowserError || params.retriesLeft > 0;
		if (willRetry) {
			const retryPayload: LambdaPayloads[LambdaRoutines.renderer] = {
				...params,
				retriesLeft: params.retriesLeft - 1,
			};
			await getLambdaClient(getCurrentRegionInFunction()).send(
				new InvokeCommand({
					FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
					// @ts-expect-error
					Payload: JSON.stringify(retryPayload),
					InvocationType: 'Event',
				})
			);
		}

		console.log('Error occurred');
		console.log(err);
		await writeLambdaError({
			bucketName: params.bucketName,
			errorInfo: {
				stack: (err as Error).stack as string,
				chunk: params.chunk,
				frame: null,
				type: 'renderer',
				isFatal: !isBrowserError,
				tmpDir: getTmpDirStateIfENoSp((err as Error).stack as string),
				attempt: params.attempt,
				totalAttempts: params.retriesLeft + params.attempt,
				willRetry,
			},
			renderId: params.renderId,
			expectedBucketOwner: options.expectedBucketOwner,
		});
	} finally {
		await closeBrowser();
		if (params.saveBrowserLogs) {
			await uploadBrowserLogs({
				chunk: params.chunk,
				bucketName: params.bucketName,
				endFrame: params.frameRange[1],
				startFrame: params.frameRange[0],
				expectedBucketOwner: options.expectedBucketOwner,
				logs,
				renderId: params.renderId,
			});
		}
	}
};
