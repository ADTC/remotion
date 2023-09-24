import {BundlerInternals} from '@remotion/bundler';
import {
	binaryPath as x64BinaryPath,
	ffmpegCwd,
} from '@remotion/compositor-linux-x64-gnu';
import fs from 'fs';
import path from 'path';

const bundleRenderLogic = async () => {
	const outdir = path.join(__dirname, '../../container/dist');
	fs.mkdirSync(outdir, {
		recursive: true,
	});
	const outfile = path.join(outdir, 'index.js');

	(fs.rmSync ?? fs.rmdirSync)(outdir, {recursive: true});
	fs.mkdirSync(outdir, {recursive: true});
	const template = require.resolve(path.join(__dirname, '../functions/index'));

	await BundlerInternals.esbuild.build({
		platform: 'node',
		target: 'node18',
		bundle: true,
		outfile,
		entryPoints: [template],
		treeShaking: true,
		external: [
			'./compositor',
			'./compositor.exe',
			'./ffmpeg/remotion/bin/ffmpeg',
			'./ffmpeg/remotion/bin/ffprobe',
		],
	});

	const compositorFile = `${outdir}/compositor`;

	fs.copyFileSync(x64BinaryPath, compositorFile);
	fs.cpSync(ffmpegCwd, `${outdir}/ffmpeg`, {recursive: true});

	fs.cpSync(
		path.join(
			__dirname,
			'..',
			'..',
			'..',
			'renderer',
			'node_modules',
			'source-map',
			'lib',
			'mappings.wasm',
		),
		`${outdir}/mappings.wasm`,
	);

	console.log('distribution bundled.');
};

bundleRenderLogic();
