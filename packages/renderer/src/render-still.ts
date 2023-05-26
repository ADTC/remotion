import fs, {statSync} from 'node:fs';
import path from 'node:path';
import type {AnySmallCompMetadata} from 'remotion';
import {Internals} from 'remotion';
import type {RenderMediaOnDownload} from './assets/download-and-map-assets-to-file';
import type {DownloadMap} from './assets/download-map';
import {cleanDownloadMap, makeDownloadMap} from './assets/download-map';
import {DEFAULT_BROWSER} from './browser';
import type {BrowserExecutable} from './browser-executable';
import type {BrowserLog} from './browser-log';
import type {Browser as PuppeteerBrowser} from './browser/Browser';
import type {ConsoleMessage} from './browser/ConsoleMessage';
import type {Compositor} from './compositor/compositor';
import {convertToPositiveFrameIndex} from './convert-to-positive-frame-index';
import {ensureOutputDirectory} from './ensure-output-directory';
import {handleJavascriptException} from './error-handling/handle-javascript-exception';
import {findRemotionRoot} from './find-closest-package-json';
import type {StillImageFormat} from './image-format';
import {
	DEFAULT_STILL_IMAGE_FORMAT,
	validateStillImageFormat,
} from './image-format';
import {validateJpegQuality} from './jpeg-quality';
import type {CancelSignal} from './make-cancel-signal';
import {cancelErrorMessages} from './make-cancel-signal';
import type {ChromiumOptions} from './open-browser';
import {openBrowser} from './open-browser';
import {prepareServer} from './prepare-server';
import {puppeteerEvaluateWithCatch} from './puppeteer-evaluate';
import {seekToFrame} from './seek-to-frame';
import {setPropsAndEnv} from './set-props-and-env';
import {takeFrameAndCompose} from './take-frame-and-compose';
import {validatePuppeteerTimeout} from './validate-puppeteer-timeout';
import {validateScale} from './validate-scale';

type InnerStillOptions = {
	composition: AnySmallCompMetadata;
	output?: string | null;
	frame?: number;
	inputProps?: Record<string, unknown>;
	imageFormat?: StillImageFormat;
	/**
	 * @deprecated Renamed to `jpegQuality`
	 */
	quality?: never;
	jpegQuality?: number;
	puppeteerInstance?: PuppeteerBrowser;
	dumpBrowserLogs?: boolean;
	envVariables?: Record<string, string>;
	overwrite?: boolean;
	browserExecutable?: BrowserExecutable;
	onBrowserLog?: (log: BrowserLog) => void;
	timeoutInMilliseconds?: number;
	chromiumOptions?: ChromiumOptions;
	scale?: number;
	onDownload?: RenderMediaOnDownload;
	cancelSignal?: CancelSignal;
	/**
	 * @deprecated Only for Remotion internal usage
	 */
	downloadMap?: DownloadMap;
	/**
	 * @deprecated Only for Remotion internal usage
	 */
	indent?: boolean;
	verbose?: boolean;
};

type RenderStillReturnValue = {buffer: Buffer | null};

export type RenderStillOptions = InnerStillOptions & {
	serveUrl: string;
	port?: number | null;
};

const innerRenderStill = async ({
	composition,
	quality,
	imageFormat = DEFAULT_STILL_IMAGE_FORMAT,
	serveUrl,
	puppeteerInstance,
	dumpBrowserLogs = false,
	onError,
	inputProps,
	envVariables,
	output,
	frame = 0,
	overwrite = true,
	browserExecutable,
	timeoutInMilliseconds,
	chromiumOptions,
	scale = 1,
	proxyPort,
	cancelSignal,
	downloadMap,
	jpegQuality,
	onBrowserLog,
	compositor,
}: InnerStillOptions & {
	downloadMap: DownloadMap;
	serveUrl: string;
	onError: (err: Error) => void;
	proxyPort: number;
	compositor: Compositor;
}): Promise<RenderStillReturnValue> => {
	if (quality) {
		throw new Error(
			'quality has been renamed to jpegQuality. Please rename the option.'
		);
	}

	Internals.validateDimension(
		composition.height,
		'height',
		'in the `config` object passed to `renderStill()`'
	);
	Internals.validateDimension(
		composition.width,
		'width',
		'in the `config` object passed to `renderStill()`'
	);
	Internals.validateFps(
		composition.fps,
		'in the `config` object of `renderStill()`',
		false
	);
	Internals.validateDurationInFrames({
		durationInFrames: composition.durationInFrames,
		component: 'in the `config` object passed to `renderStill()`',
		allowFloats: false,
	});
	validateStillImageFormat(imageFormat);
	Internals.validateFrame({
		frame,
		durationInFrames: composition.durationInFrames,
		allowFloats: false,
	});
	const stillFrame = convertToPositiveFrameIndex({
		durationInFrames: composition.durationInFrames,
		frame,
	});
	validatePuppeteerTimeout(timeoutInMilliseconds);
	validateScale(scale);

	output =
		typeof output === 'string' ? path.resolve(process.cwd(), output) : null;

	if (jpegQuality !== undefined && imageFormat !== 'jpeg') {
		throw new Error(
			"You can only pass the `quality` option if `imageFormat` is 'jpeg'."
		);
	}

	validateJpegQuality(jpegQuality);

	if (output) {
		if (fs.existsSync(output)) {
			if (!overwrite) {
				throw new Error(
					`Cannot render still - "overwrite" option was set to false, but the output destination ${output} already exists.`
				);
			}

			const stat = statSync(output);

			if (!stat.isFile()) {
				throw new Error(
					`The output location ${output} already exists, but is not a file, but something else (e.g. folder). Cannot save to it.`
				);
			}
		}

		ensureOutputDirectory(output);
	}

	const browserInstance =
		puppeteerInstance ??
		(await openBrowser(DEFAULT_BROWSER, {
			browserExecutable,
			shouldDumpIo: dumpBrowserLogs,
			chromiumOptions,
			forceDeviceScaleFactor: scale ?? 1,
			indent: false,
		}));
	const page = await browserInstance.newPage();
	await page.setViewport({
		width: composition.width,
		height: composition.height,
		deviceScaleFactor: scale ?? 1,
	});

	const errorCallback = (err: Error) => {
		onError(err);
		cleanup();
	};

	const cleanUpJSException = handleJavascriptException({
		page,
		onError: errorCallback,
		frame: null,
	});

	const logCallback = (log: ConsoleMessage) => {
		onBrowserLog?.({
			stackTrace: log.stackTrace(),
			text: log.text,
			type: log.type,
		});
	};

	const cleanup = async () => {
		cleanUpJSException();
		page.off('console', logCallback);

		if (puppeteerInstance) {
			await page.close();
		} else {
			browserInstance.close(true).catch((err) => {
				console.log('Unable to close browser', err);
			});
		}
	};

	cancelSignal?.(() => {
		cleanup();
	});

	if (onBrowserLog) {
		page.on('console', logCallback);
	}

	await setPropsAndEnv({
		inputProps: inputProps ?? {},
		envVariables,
		page,
		serveUrl,
		initialFrame: stillFrame,
		timeoutInMilliseconds,
		proxyPort,
		retriesRemaining: 2,
		audioEnabled: false,
		videoEnabled: true,
	});

	await puppeteerEvaluateWithCatch({
		// eslint-disable-next-line max-params
		pageFunction: (
			id: string,
			defaultProps: Record<string, unknown>,
			durationInFrames: number,
			fps: number,
			height: number,
			width: number
		) => {
			window.setBundleMode({
				type: 'composition',
				compositionName: id,
				compositionDefaultProps: defaultProps,
				compositionDurationInFrames: durationInFrames,
				compositionFps: fps,
				compositionHeight: height,
				compositionWidth: width,
			});
		},
		args: [
			composition.id,
			composition.defaultProps,
			composition.durationInFrames,
			composition.fps,
			composition.height,
			composition.width,
		],
		frame: null,
		page,
	});
	await seekToFrame({frame: stillFrame, page});

	const {buffer} = await takeFrameAndCompose({
		downloadMap,
		frame: stillFrame,
		freePage: page,
		height: composition.height,
		width: composition.width,
		imageFormat,
		scale,
		output,
		jpegQuality,
		wantsBuffer: !output,
		compositor,
	});

	await cleanup();

	return {buffer: output ? null : buffer};
};

/**
 *
 * @description Render a still frame from a composition
 * @see [Documentation](https://www.remotion.dev/docs/renderer/render-still)
 */
export const renderStill = (
	options: RenderStillOptions
): Promise<RenderStillReturnValue> => {
	const downloadMap = options.downloadMap ?? makeDownloadMap();

	const onDownload = options.onDownload ?? (() => () => undefined);

	const happyPath = new Promise<RenderStillReturnValue>((resolve, reject) => {
		const onError = (err: Error) => reject(err);

		let close: ((force: boolean) => Promise<unknown>) | null = null;

		prepareServer({
			webpackConfigOrServeUrl: options.serveUrl,
			onDownload,
			onError,
			port: options.port ?? null,
			downloadMap,
			remotionRoot: findRemotionRoot(),
			concurrency: 1,
			verbose: options.verbose ?? false,
			indent: options.indent ?? false,
		})
			.then(({serveUrl, closeServer, offthreadPort, compositor}) => {
				close = closeServer;
				return innerRenderStill({
					...options,
					serveUrl,
					onError: (err) => reject(err),
					proxyPort: offthreadPort,
					downloadMap,
					compositor,
				});
			})

			.then((res) => resolve(res))
			.catch((err) => reject(err))
			.finally(() => {
				// Clean download map if it was not passed in
				if (!options?.downloadMap) {
					cleanDownloadMap(downloadMap);
				}

				return close?.(false);
			});
	});

	return Promise.race([
		happyPath,
		new Promise<RenderStillReturnValue>((_resolve, reject) => {
			options.cancelSignal?.(() => {
				reject(new Error(cancelErrorMessages.renderStill));
			});
		}),
	]);
};
