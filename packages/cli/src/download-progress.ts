import {formatBytes} from './format-bytes';
import {INDENT_TOKEN} from './log';
import {makeProgressBar} from './make-progress-bar';
import type {DownloadProgress} from './progress-types';

export const getFileSizeDownloadBar = (downloaded: number) => {
	const desiredLength = makeProgressBar(0).length;

	return `[${formatBytes(downloaded).padEnd(desiredLength - 2, ' ')}]`;
};

export const makeMultiDownloadProgress = (
	progresses: DownloadProgress[],
	indent: boolean
) => {
	if (progresses.length === 0) {
		return null;
	}

	if (progresses.length === 1) {
		const [progress] = progresses;
		const truncatedFileName =
			progress.name.length >= 60
				? progress.name.substring(0, 57) + '...'
				: progress.name;
		return [
			indent ? INDENT_TOKEN : null,
			`    +`,
			progress.progress
				? makeProgressBar(progress.progress)
				: getFileSizeDownloadBar(progress.downloaded),
			`Downloading ${truncatedFileName}`,
		].join(' ');
	}

	const everyFileHasContentLength = progresses.every(
		(p) => p.totalBytes !== null
	);

	return [
		indent ? INDENT_TOKEN : null,
		// TODO: Shifted 1 character to the right in v4
		`    +`,
		everyFileHasContentLength
			? makeProgressBar(
					progresses.reduce((a, b) => a + (b.progress as number), 0) /
						progresses.length
			  )
			: getFileSizeDownloadBar(
					progresses.reduce((a, b) => a + b.downloaded, 0)
			  ),
		`Downloading ${progresses.length} files`,
	].join(' ');
};
