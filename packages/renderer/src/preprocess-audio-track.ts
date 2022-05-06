import execa from 'execa';
import {FfmpegExecutable} from 'remotion';
import {MediaAsset} from './assets/types';
import {calculateFfmpegFilter} from './calculate-ffmpeg-filters';
import {makeFfmpegFilterFile} from './ffmpeg-filter-file';
import {pLimit} from './p-limit';
import {resolveAssetSrc} from './resolve-asset-src';

type Options = {
	ffmpegExecutable: FfmpegExecutable;
	outName: string;
	asset: MediaAsset;
	expectedFrames: number;
	fps: number;
};

const preprocessAudioTrackUnlimited = async ({
	ffmpegExecutable,
	outName,
	asset,
	expectedFrames,
	fps,
}: Options): Promise<string | null> => {
	const filter = calculateFfmpegFilter({
		asset,
		durationInFrames: expectedFrames,
		fps,
	});

	if (filter === null) {
		return null;
	}

	const {cleanup, file} = await makeFfmpegFilterFile(filter);

	const args = [
		['-i', resolveAssetSrc(asset.src)],
		['-ac', '2'],
		['-filter_script:a', file],
		['-c:a', 'pcm_s16le'],
		['-y', outName],
	].flat(2);

	await execa(ffmpegExecutable ?? 'ffmpeg', args);

	cleanup();
	return outName;
};

const limit = pLimit(2);

export const preprocessAudioTrack = (options: Options) => {
	return limit(preprocessAudioTrackUnlimited, options);
};
