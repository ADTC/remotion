// Combine multiple video chunks, useful for decentralized rendering

import {rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {AudioCodec} from './audio-codec';
import {
	getDefaultAudioCodec,
	mapAudioCodecToFfmpegAudioCodecName,
} from './audio-codec';
import {callFf} from './call-ffmpeg';
import type {Codec} from './codec';
import {isAudioCodec} from './is-audio-codec';
import {Log} from './logger';
import {parseFfmpegProgress} from './parse-ffmpeg-progress';
import {truthy} from './truthy';

type Options = {
	files: string[];
	filelistDir: string;
	output: string;
	onProgress: (p: number) => void;
	numberOfFrames: number;
	codec: Codec;
	fps: number;
	numberOfGifLoops: number | null;
	audioCodec: AudioCodec | null;
	audioBitrate: string | null;
};

export const combineVideos = async (options: Options) => {
	const {
		files,
		filelistDir,
		output,
		onProgress,
		numberOfFrames,
		codec,
		fps,
		numberOfGifLoops,
		audioCodec,
		audioBitrate,
	} = options;
	const fileList = files.map((p) => `file '${p}'`).join('\n');

	const fileListTxt = join(filelistDir, 'files.txt');
	writeFileSync(fileListTxt, fileList);

	const resolvedAudioCodec =
		audioCodec ?? getDefaultAudioCodec({codec, preferLossless: false});

	const command = [
		isAudioCodec(codec) ? null : '-r',
		isAudioCodec(codec) ? null : String(fps),
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		fileListTxt,
		numberOfGifLoops === null ? null : '-loop',
		numberOfGifLoops === null
			? null
			: typeof numberOfGifLoops === 'number'
			? String(numberOfGifLoops)
			: '-1',
		isAudioCodec(codec) ? null : '-c:v',
		isAudioCodec(codec) ? null : codec === 'gif' ? 'gif' : 'copy',
		resolvedAudioCodec ? '-c:a' : null,
		resolvedAudioCodec
			? mapAudioCodecToFfmpegAudioCodecName(resolvedAudioCodec)
			: null,
		resolvedAudioCodec === 'aac' ? '-cutoff' : null,
		resolvedAudioCodec === 'aac' ? '18000' : null,
		'-b:a',
		audioBitrate ? audioBitrate : '320k',
		codec === 'h264' ? '-movflags' : null,
		codec === 'h264' ? 'faststart' : null,
		'-y',
		output,
	].filter(truthy);

	Log.verbose('Combining command: ', command);

	try {
		const task = callFf('ffmpeg', command);
		task.stderr?.on('data', (data: Buffer) => {
			if (onProgress) {
				const parsed = parseFfmpegProgress(data.toString('utf8'));
				if (parsed === undefined) {
					Log.verbose(data.toString('utf8'));
				} else {
					Log.verbose(`Combined ${parsed} frames`);
					onProgress(parsed);
				}
			}
		});

		await task;
		onProgress(numberOfFrames);
		rmSync(filelistDir, {recursive: true});
	} catch (err) {
		rmSync(filelistDir, {recursive: true});
		throw err;
	}
};
