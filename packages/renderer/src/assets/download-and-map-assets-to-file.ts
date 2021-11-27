import {createWriteStream} from 'fs';
import got from 'got';
import path from 'path';
import {random, TAsset} from 'remotion';
import sanitizeFilename from 'sanitize-filename';
import {ensureOutputDirectory} from '../ensure-output-directory';

export type RenderMediaOnDownload = (
	src: string
) => ((progress: {percent: number}) => void) | undefined | void;

const isDownloadingMap: {[key: string]: boolean} = {};
const hasBeenDownloadedMap: {[key: string]: boolean} = {};
const listeners: {[key: string]: (() => void)[]} = {};

const waitForAssetToBeDownloaded = (src: string) => {
	if (!listeners[src]) {
		listeners[src] = [];
	}

	return new Promise<void>((resolve) => {
		listeners[src].push(() => resolve());
	});
};

const notifyAssetIsDownloaded = (src: string) => {
	if (!listeners[src]) {
		listeners[src] = [];
	}

	listeners[src].forEach((fn) => fn());
	isDownloadingMap[src] = false;
	hasBeenDownloadedMap[src] = true;
};

const downloadAsset = async (
	src: string,
	to: string,
	onDownload: RenderMediaOnDownload
) => {
	if (hasBeenDownloadedMap[src]) {
		return;
	}

	if (isDownloadingMap[src]) {
		return waitForAssetToBeDownloaded(src);
	}

	isDownloadingMap[src] = true;

	const onProgress = onDownload(src);
	ensureOutputDirectory(to);

	// Listen to 'close' event instead of more
	// concise method to avoid this problem
	// https://github.com/remotion-dev/remotion/issues/384#issuecomment-844398183
	await new Promise<void>((resolve, reject) => {
		const writeStream = createWriteStream(to);

		writeStream.on('close', () => resolve());
		writeStream.on('error', (err) => reject(err));

		const stream = got.stream(src);
		stream.on('downloadProgress', ({percent}) => {
			onProgress?.({
				percent,
			});
		});
		stream.pipe(writeStream).on('error', (err) => reject(err));
	});
	notifyAssetIsDownloaded(src);
};

export const markAllAssetsAsDownloaded = () => {
	Object.keys(hasBeenDownloadedMap).forEach((key) => {
		delete hasBeenDownloadedMap[key];
	});

	Object.keys(isDownloadingMap).forEach((key) => {
		delete isDownloadingMap[key];
	});
};

export const getSanitizedFilenameForAssetUrl = ({
	src,
	downloadDir,
}: {
	src: string;
	downloadDir: string;
}) => {
	const {pathname, search} = new URL(src);

	const split = pathname.split('.');
	const fileExtension =
		split.length > 1 && split[split.length - 1]
			? `.${split[split.length - 1]}`
			: '';
	const hashedFileName = String(random(`${pathname}${search}`)).replace(
		'0.',
		''
	);
	return path.join(
		downloadDir,
		sanitizeFilename(hashedFileName + fileExtension)
	);
};

export const downloadAndMapAssetsToFileUrl = async ({
	asset,
	downloadDir,
	onDownload,
}: {
	asset: TAsset;
	downloadDir: string;
	onDownload: RenderMediaOnDownload;
}): Promise<TAsset> => {
	const newSrc = getSanitizedFilenameForAssetUrl({
		src: asset.src,
		downloadDir,
	});

	await downloadAsset(asset.src, newSrc, onDownload);

	return {
		...asset,
		src: newSrc,
	};
};
