import {spawn} from 'child_process';
import {platform} from 'os';
import path from 'path';
import {truthy} from '../../truthy';

export const openDirectoryInFinder = (
	dirToOpen: string,
	allowedDirectory: string
) => {
	const resolved = path.resolve(allowedDirectory, dirToOpen);

	const relativeToProcessCwd = path.relative(allowedDirectory, resolved);
	if (relativeToProcessCwd.startsWith('..')) {
		throw new Error(`Not allowed to open ${relativeToProcessCwd}`);
	}

	const command =
		platform() === 'darwin'
			? 'open'
			: platform() === 'linux'
			? 'xdg-open'
			: 'start';

	const p = spawn(
		command,
		[platform() === 'darwin' ? '-R' : null, dirToOpen].filter(truthy)
	);

	const stderrChunks: Buffer[] = [];
	p.stderr.on('data', (d) => stderrChunks.push(d));

	return new Promise<void>((resolve, reject) => {
		p.on('exit', (code) => {
			if (code === 0) {
				resolve();
			} else {
				const message = Buffer.concat(stderrChunks).toString('utf-8');
				reject(new Error(message));
			}
		});
		p.on('error', (err) => {
			p.kill();
			if (err) {
				reject(err);
			}
		});
	});
};
