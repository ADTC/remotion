import type {StdioOptions} from 'child_process';
import fs, {existsSync, rmSync} from 'fs';
import {execSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {finished} from 'node:stream/promises';
import type {ReadableStream} from 'node:stream/web';
import os from 'os';
import path from 'path';

const getIsSemVer = (str: string) => {
	return /^[\d]{1}\.[\d]{1,2}\.+/.test(str);
};

const installForWindows = async ({
	version,
	to,
	printOutput,
}: {
	version: string;
	to: string;
	printOutput: boolean;
}) => {
	if (!getIsSemVer(version)) {
		throw new Error(`Non-semantic version provided. Only releases of Whisper.cpp are supported on Windows (e.g., 1.5.4). Provided version:
		${version}. See https://www.remotion.dev/docs/install-whisper-cpp/install-whisper-cpp#version for more information.`);
	}

	const url =
		version === '1.5.5'
			? 'https://remotion-ffmpeg-binaries.s3.eu-central-1.amazonaws.com/whisper-bin-x64-1-5-5.zip'
			: `https://github.com/ggerganov/whisper.cpp/releases/download/v${version}/whisper-bin-x64.zip`;

	const filePath = path.join(process.cwd(), 'whisper-bin-x64.zip');
	const fileStream = fs.createWriteStream(filePath);

	const {body} = await fetch(url);
	if (body === null) {
		throw new Error('Failed to download whisper binary');
	}

	await finished(
		Readable.fromWeb(body as unknown as ReadableStream).pipe(fileStream),
	);

	execSync(`Expand-Archive -Force ${filePath} ${to}`, {
		shell: 'powershell',
		stdio: printOutput ? 'inherit' : 'ignore',
	});

	rmSync(filePath);
};

const installWhisperForUnix = ({
	version,
	to,
	printOutput,
}: {
	version: string;
	to: string;
	printOutput: boolean;
}) => {
	const stdio: StdioOptions = printOutput ? 'inherit' : 'ignore';
	execSync(`git clone https://github.com/ggerganov/whisper.cpp.git ${to}`, {
		stdio,
	});

	const ref = getIsSemVer(version) ? `v${version}` : version;

	execSync(`git checkout ${ref}`, {
		stdio,
		cwd: to,
	});

	execSync(`make`, {
		cwd: to,
		stdio,
	});
};

export const getWhisperExecutablePath = (whisperPath: string) => {
	return os.platform() === 'win32'
		? path.join(whisperPath, 'main.exe')
		: path.join(whisperPath, './main');
};

export const installWhisperCpp = async ({
	version,
	to,
	printOutput = true,
}: {
	version: string;
	to: string;
	printOutput?: boolean;
}): Promise<{
	alreadyExisted: boolean;
}> => {
	if (existsSync(to)) {
		if (!existsSync(getWhisperExecutablePath(to))) {
			if (printOutput) {
				console.log(
					`Whisper folder exists but the executable (${to}) is missing. Delete ${to} and try again.`,
				);
			}

			return Promise.resolve({alreadyExisted: false});
		}

		if (printOutput) {
			console.log(`Whisper already exists at ${to}`);
		}

		return Promise.resolve({alreadyExisted: true});
	}

	if (process.platform === 'darwin' || process.platform === 'linux') {
		installWhisperForUnix({version, to, printOutput});
		return Promise.resolve({alreadyExisted: false});
	}

	if (process.platform === 'win32') {
		await installForWindows({version, to, printOutput});
		return Promise.resolve({alreadyExisted: false});
	}

	throw new Error(`Unsupported platform: ${process.platform}`);
};
