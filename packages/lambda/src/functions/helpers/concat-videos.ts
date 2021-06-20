import {combineVideos} from '@remotion/renderer';
import {
	createWriteStream,
	existsSync,
	mkdirSync,
	promises,
	rmdirSync,
	rmSync,
} from 'fs';
import path, {join} from 'path';
import {Codec} from 'remotion';
import {AwsRegion} from '../../pricing/aws-regions';
import {chunkKey} from '../../shared/constants';
import {getFileExtensionFromCodec} from '../../shared/get-file-extension-from-codec';
import {tmpDir} from '../../shared/tmpdir';
import {lambdaLs, lambdaReadFile} from './io';
import {timer} from './timer';

export const getChunkDownloadOutputLocation = ({
	outdir,
	file,
}: {
	outdir: string;
	file: string;
}) => {
	return path.join(outdir, path.basename(file));
};

const downloadS3File = async ({
	bucket,
	key,
	outdir,
	region,
}: {
	bucket: string;
	key: string;
	outdir: string;
	region: AwsRegion;
}) => {
	const Body = await lambdaReadFile({
		bucketName: bucket,
		key,
		region,
	});
	const outpath = getChunkDownloadOutputLocation({outdir, file: key});
	if (Buffer.isBuffer(Body)) {
		return promises.writeFile(outpath, Body);
	}

	return new Promise<void>((resolve, reject) => {
		Body.pipe(createWriteStream(outpath))
			.on('error', (err) => reject(err))
			.on('close', () => resolve());
	});
};

const getAllFilesS3 = async ({
	bucket,
	expectedFiles,
	outdir,
	renderId,
	region,
}: {
	bucket: string;
	expectedFiles: number;
	outdir: string;
	renderId: string;
	region: AwsRegion;
}): Promise<string[]> => {
	const alreadyDownloading: {[key: string]: true} = {};
	const downloaded: {[key: string]: true} = {};

	const getFiles = async () => {
		const prefix = chunkKey(renderId);
		const lsTimer = timer('Listing files');
		const contents = await lambdaLs({
			bucketName: bucket,
			prefix,
			region,
		});
		lsTimer.end();
		return contents
			.filter((c) => c.Key?.startsWith(chunkKey(renderId)))
			.map((_) => _.Key as string);
	};

	return new Promise<string[]>((resolve, reject) => {
		const loop = async () => {
			const filesInBucket = await getFiles();
			const checkFinish = () => {
				const areAllFilesDownloaded =
					Object.keys(downloaded).length === expectedFiles;
				if (areAllFilesDownloaded) {
					resolve(
						filesInBucket.map((file) =>
							getChunkDownloadOutputLocation({outdir, file})
						)
					);
				}
			};

			filesInBucket.forEach(async (key) => {
				if (alreadyDownloading[key]) {
					return;
				}

				alreadyDownloading[key] = true;
				try {
					const downloadTimer = timer('Downloading ' + key);
					await downloadS3File({
						bucket,
						key,
						outdir,
						region,
					});
					downloadTimer.end();
					downloaded[key] = true;
					checkFinish();
				} catch (err) {
					reject(err);
				}
			});

			const areAllFilesDownloading =
				Object.keys(alreadyDownloading).length === expectedFiles;
			if (!areAllFilesDownloading) {
				setTimeout(() => {
					loop();
				}, 100);
			}
		};

		loop();
	});
};

export const concatVideosS3 = async ({
	bucket,
	expectedFiles,
	onProgress,
	numberOfFrames,
	renderId,
	region,
	codec,
}: {
	bucket: string;
	expectedFiles: number;
	onProgress: (frames: number) => void;
	numberOfFrames: number;
	renderId: string;
	region: AwsRegion;
	codec: Codec;
}) => {
	const outdir = join(tmpDir('remotion-concat'), 'bucket');
	if (existsSync(outdir)) {
		(rmSync ?? rmdirSync)(outdir, {
			recursive: true,
		});
	}

	mkdirSync(outdir);
	const files = await getAllFilesS3({
		bucket,
		expectedFiles,
		outdir,
		renderId,
		region,
	});

	const outfile = join(
		tmpDir('remotion-concated'),
		'concat.' + getFileExtensionFromCodec(codec, 'final')
	);
	const combine = timer('Combine videos');
	const filelistDir = tmpDir('remotion-filelist');
	await combineVideos({
		files,
		filelistDir,
		output: outfile,
		onProgress,
		numberOfFrames,
		codec,
	});
	combine.end();

	(rmSync ?? rmdirSync)(outdir, {
		recursive: true,
	});
	return outfile;
};
