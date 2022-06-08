import {ExecaChildProcess} from 'execa';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type {Browser as PuppeteerBrowser} from 'puppeteer-core';
import {
	BrowserExecutable,
	Codec,
	FfmpegExecutable,
	FrameRange,
	Internals,
	PixelFormat,
	ProResProfile,
	SmallTCompMetadata,
} from 'remotion';
import {RenderMediaOnDownload} from './assets/download-and-map-assets-to-file';
import {BrowserLog} from './browser-log';
import {canUseParallelEncoding} from './can-use-parallel-encoding';
import {ensureFramesInOrder} from './ensure-frames-in-order';
import {ensureOutputDirectory} from './ensure-output-directory';
import {getFramesToRender} from './get-duration-from-frame-range';
import {getFileExtensionFromCodec} from './get-extension-from-codec';
import {getExtensionOfFilename} from './get-extension-of-filename';
import {getRealFrameRange} from './get-frame-to-render';
import {
	getServeUrlWithFallback,
	ServeUrlOrWebpackBundle,
} from './legacy-webpack-config';
import {CancelSignal, makeCancelSignal} from './make-cancel-signal';
import {ChromiumOptions} from './open-browser';
import {prespawnFfmpeg} from './prespawn-ffmpeg';
import {renderFrames} from './render-frames';
import {stitchFramesToVideo} from './stitch-frames-to-video';
import {tmpDir} from './tmp-dir';
import {OnStartData} from './types';
import {validateEvenDimensionsWithCodec} from './validate-even-dimensions-with-codec';
import {validateOutputFilename} from './validate-output-filename';
import {validateScale} from './validate-scale';

export type StitchingState = 'encoding' | 'muxing' | 'gif';

export type RenderMediaOnProgress = (progress: {
	renderedFrames: number;
	encodedFrames: number;
	encodedDoneIn: number | null;
	renderedDoneIn: number | null;
	stitchStage: StitchingState;
}) => void;

export type RenderMediaOptions = {
	outputLocation: string;
	codec: Codec;
	composition: SmallTCompMetadata;
	inputProps?: unknown;
	parallelism?: number | null;
	crf?: number | null;
	imageFormat?: 'png' | 'jpeg' | 'none';
	ffmpegExecutable?: FfmpegExecutable;
	ffprobeExecutable?: FfmpegExecutable;
	pixelFormat?: PixelFormat;
	envVariables?: Record<string, string>;
	quality?: number;
	frameRange?: FrameRange | null;
	everyNthFrame: number;
	loop: number | null;
	puppeteerInstance?: PuppeteerBrowser;
	overwrite?: boolean;
	onProgress?: RenderMediaOnProgress;
	onDownload?: RenderMediaOnDownload;
	proResProfile?: ProResProfile;
	dumpBrowserLogs?: boolean;
	onBrowserLog?: ((log: BrowserLog) => void) | undefined;
	onStart?: (data: OnStartData) => void;
	timeoutInMilliseconds?: number;
	chromiumOptions?: ChromiumOptions;
	scale?: number;
	port?: number | null;
	cancelSignal?: CancelSignal;
	browserExecutable?: BrowserExecutable;
} & ServeUrlOrWebpackBundle;

type Await<T> = T extends PromiseLike<infer U> ? U : T;

export const renderMedia = ({
	parallelism,
	proResProfile,
	crf,
	composition,
	imageFormat,
	ffmpegExecutable,
	ffprobeExecutable,
	inputProps,
	pixelFormat,
	codec,
	envVariables,
	quality,
	frameRange,
	puppeteerInstance,
	outputLocation,
	onProgress,
	overwrite,
	onDownload,
	everyNthFrame,
	dumpBrowserLogs,
	onBrowserLog,
	onStart,
	timeoutInMilliseconds,
	chromiumOptions,
	scale,
	browserExecutable,
	port,
	cancelSignal,
	...options
}: RenderMediaOptions): Promise<void> => {
	Internals.validateQuality(quality);
	if (typeof crf !== 'undefined' && crf !== null) {
		Internals.validateSelectedCrfAndCodecCombination(crf, codec);
	}

	validateOutputFilename(codec, getExtensionOfFilename(outputLocation));

	validateScale(scale);

	const serveUrl = getServeUrlWithFallback(options);

	let stitchStage: StitchingState = 'encoding';
	let stitcherFfmpeg: ExecaChildProcess<string> | undefined;
	let preStitcher: Await<ReturnType<typeof prespawnFfmpeg>> | null = null;
	let encodedFrames = 0;
	let renderedFrames = 0;
	let renderedDoneIn: number | null = null;
	let encodedDoneIn: number | null = null;
	let cancelled = false;

	const renderStart = Date.now();
	const tmpdir = tmpDir('pre-encode');
	const parallelEncoding = canUseParallelEncoding(codec);
	const actualImageFormat = imageFormat ?? 'jpeg';

	const preEncodedFileLocation = parallelEncoding
		? path.join(
				tmpdir,
				'pre-encode.' + getFileExtensionFromCodec(codec, 'chunk')
		  )
		: null;

	const outputDir = parallelEncoding
		? null
		: fs.mkdtempSync(path.join(os.tmpdir(), 'react-motion-render'));

	validateEvenDimensionsWithCodec({
		codec,
		height: composition.height,
		scale: scale ?? 1,
		width: composition.width,
	});

	const callUpdate = () => {
		onProgress?.({
			encodedDoneIn,
			encodedFrames,
			renderedDoneIn,
			renderedFrames,
			stitchStage,
		});
	};

	const realFrameRange = getRealFrameRange(
		composition.durationInFrames,
		frameRange ?? null
	);

	const cancelRenderFrames = makeCancelSignal();
	const cancelPrestitcher = makeCancelSignal();
	const cancelStitcher = makeCancelSignal();

	cancelSignal?.(() => {
		cancelRenderFrames.cancel();
	});

	const {waitForRightTimeOfFrameToBeInserted, setFrameToStitch, waitForFinish} =
		ensureFramesInOrder(realFrameRange);

	const fps = composition.fps / everyNthFrame;

	const createPrestitcherIfNecessary = async () => {
		if (preEncodedFileLocation) {
			preStitcher = await prespawnFfmpeg({
				width: composition.width * (scale ?? 1),
				height: composition.height * (scale ?? 1),
				fps,
				outputLocation: preEncodedFileLocation,
				pixelFormat,
				codec,
				proResProfile,
				crf,
				onProgress: (frame: number) => {
					encodedFrames = frame;
					callUpdate();
				},
				verbose: Internals.Logging.isEqualOrBelowLogLevel(
					Internals.Logging.getLogLevel(),
					'verbose'
				),
				ffmpegExecutable,
				imageFormat: actualImageFormat,
				signal: cancelPrestitcher.cancelSignal,
			});
			stitcherFfmpeg = preStitcher.task;
		}
	};

	const waitForPrestitcherIfNecessary = async () => {
		if (stitcherFfmpeg) {
			await waitForFinish();
			stitcherFfmpeg?.stdin?.end();
			try {
				await stitcherFfmpeg;
			} catch (err) {
				throw new Error(preStitcher?.getLogs());
			}
		}
	};

	const happyPath = createPrestitcherIfNecessary()
		.then(() => {
			const renderFramesProc = renderFrames({
				config: composition,
				onFrameUpdate: (frame: number) => {
					renderedFrames = frame;
					callUpdate();
				},
				parallelism,
				outputDir,
				onStart: (data) => {
					renderedFrames = 0;
					callUpdate();
					onStart?.(data);
				},
				inputProps,
				envVariables,
				imageFormat: actualImageFormat,
				quality,
				frameRange: frameRange ?? null,
				puppeteerInstance,
				everyNthFrame,
				onFrameBuffer: parallelEncoding
					? async (buffer, frame) => {
							await waitForRightTimeOfFrameToBeInserted(frame);
							if (cancelled) {
								return;
							}

							const id = Internals.perf.startPerfMeasure('piping');
							stitcherFfmpeg?.stdin?.write(buffer);
							Internals.perf.stopPerfMeasure(id);

							setFrameToStitch(frame + 1);
					  }
					: undefined,
				serveUrl,
				dumpBrowserLogs,
				onBrowserLog,
				onDownload,
				timeoutInMilliseconds,
				chromiumOptions,
				scale,
				ffmpegExecutable,
				ffprobeExecutable,
				browserExecutable,
				port,
				cancelSignal: cancelRenderFrames.cancelSignal,
			});

			return renderFramesProc;
		})
		.then((renderFramesReturn) => {
			return Promise.all([renderFramesReturn, waitForPrestitcherIfNecessary()]);
		})
		.then(([{assetsInfo}]) => {
			renderedDoneIn = Date.now() - renderStart;
			callUpdate();

			ensureOutputDirectory(outputLocation);

			const stitchStart = Date.now();
			return Promise.all([
				stitchFramesToVideo({
					width: composition.width * (scale ?? 1),
					height: composition.height * (scale ?? 1),
					fps,
					outputLocation,
					internalOptions: {
						preEncodedFileLocation,
						imageFormat: actualImageFormat,
					},
					force: overwrite ?? Internals.DEFAULT_OVERWRITE,
					pixelFormat,
					codec,
					proResProfile,
					crf,
					assetsInfo,
					ffmpegExecutable,
					ffprobeExecutable,
					onProgress: (frame: number) => {
						stitchStage = 'muxing';
						encodedFrames = frame;
						callUpdate();
					},
					onDownload,
					loop: null,
					verbose: Internals.Logging.isEqualOrBelowLogLevel(
						Internals.Logging.getLogLevel(),
						'verbose'
					),
					dir: outputDir ?? undefined,
					cancelSignal: cancelStitcher.cancelSignal,
				}),
				stitchStart,
			]);
		})
		.then(([, stitchStart]) => {
			encodedFrames = getFramesToRender(
				frameRange ?? null,
				composition.durationInFrames,
				everyNthFrame
			).length;
			encodedDoneIn = Date.now() - stitchStart;
			callUpdate();
		})
		.catch((err) => {
			/**
			 * When an error is thrown in renderFrames(...) (e.g., when delayRender() is used incorrectly), fs.unlinkSync(...) throws an error that the file is locked because ffmpeg is still running, and renderMedia returns it.
			 * Therefore we first kill the FFMPEG process before deleting the file
			 */
			cancelled = true;
			cancelRenderFrames.cancel();
			cancelStitcher.cancel();
			cancelPrestitcher.cancel();
			if (stitcherFfmpeg !== undefined && stitcherFfmpeg.exitCode === null) {
				const promise = new Promise<void>((resolve) => {
					setTimeout(() => {
						resolve();
					}, 2000);
					(stitcherFfmpeg as ExecaChildProcess<string>).on('close', resolve);
				});
				stitcherFfmpeg.kill();
				return promise.then(() => {
					throw err;
				});
			}

			throw err;
		})
		.finally(() => {
			if (
				preEncodedFileLocation !== null &&
				fs.existsSync(preEncodedFileLocation)
			) {
				fs.unlinkSync(preEncodedFileLocation);
			}
		});

	return Promise.race([
		happyPath,
		new Promise<void>((_resolve, reject) => {
			cancelSignal?.(() => {
				reject(new Error('renderMedia() got cancelled'));
			});
		}),
	]);
};
