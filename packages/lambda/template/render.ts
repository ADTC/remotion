import {InvokeCommand, LambdaClient} from '@aws-sdk/client-lambda';
import {
	CreateBucketCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import {
	getCompositions,
	openBrowser,
	renderFrames,
	stitchFramesToVideo,
} from '@remotion/renderer';
import fs, {unlinkSync} from 'fs';
import path from 'path';
import {concatVideos} from '../src/concat-videos';
import {LambdaPayload, REGION, RENDERS_BUCKET_PREFIX} from '../src/constants';
import {timer} from '../src/timer';
import {executablePath} from './get-chromium-executable-path';

const s3Client = new S3Client({region: REGION});
const lambdaClient = new LambdaClient({region: REGION});

type Await<T> = T extends PromiseLike<infer U> ? U : T;

let _browserInstance: Await<ReturnType<typeof openBrowser>> | null;

// TODO Potential race condition
const getBrowserInstance = async () => {
	if (_browserInstance) {
		return _browserInstance;
	}
	const execPath = await executablePath();
	_browserInstance = await openBrowser('chrome', {
		customExecutable: execPath,
	});
	return _browserInstance;
};

const validateComposition = async ({
	serveUrl,
	composition,
	browserInstance,
}: {
	serveUrl: string;
	composition: string;
	browserInstance: Await<ReturnType<typeof openBrowser>>;
}) => {
	// TODO: Support input props
	const compositions = await getCompositions({
		serveUrl,
		browserInstance,
	});
	const found = compositions.find((c) => c.id === composition);
	if (!found) {
		throw new Error(
			`No composition with ID ${composition} found. Available compositions: ${compositions
				.map((c) => c.id)
				.join(', ')}`
		);
	}
	return found;
};

export const handler = async (params: LambdaPayload) => {
	console.log('CONTEXT', params);
	const outputDir = '/tmp/' + 'remotion-render-' + Math.random();
	if (fs.existsSync(outputDir)) {
		fs.rmdirSync(outputDir);
	}
	fs.mkdirSync(outputDir);

	const browserInstance = await getBrowserInstance();

	if (params.type === 'init') {
		const bucketName = RENDERS_BUCKET_PREFIX + Math.random();
		const bucketTimer = timer('Creating bucket');

		// TODO: Better validation
		if (!params.chunkSize) {
			throw new Error('Pass chunkSize');
		}
		console.log('browser instanse', browserInstance);

		const comp = await validateComposition({
			serveUrl: params.serveUrl,
			composition: params.composition,
			browserInstance,
		});
		console.log(comp);

		await s3Client.send(
			new CreateBucketCommand({
				Bucket: bucketName,
				ACL: 'public-read',
			})
		);
		bucketTimer.end();
		const {chunkSize} = params;
		const chunkCount = Math.ceil(comp.durationInFrames / chunkSize);

		const chunks = new Array(chunkCount).fill(1).map((_, i) => {
			return [
				i * chunkSize,
				Math.min(comp.durationInFrames, (i + 1) * chunkSize) - 1,
			] as [number, number];
		});
		console.log(chunks);
		await Promise.all(
			chunks.map(async (chunk) => {
				const payload: LambdaPayload = {
					type: 'renderer',
					frameRange: chunk,
					serveUrl: params.serveUrl,
					chunk: chunks.indexOf(chunk),
					bucketName,
					composition: params.composition,
					fps: comp.fps,
					height: comp.height,
					width: comp.width,
					durationInFrames: comp.durationInFrames,
				};
				const callingLambdaTimer = timer('Calling lambda');
				console.log(`calling lambda ${chunk}`);
				await lambdaClient.send(
					new InvokeCommand({
						FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
						// @ts-expect-error
						Payload: JSON.stringify(payload),
						InvocationType: 'Event',
					})
				);
				callingLambdaTimer.end();
			})
		);
		const out = await concatVideos(s3Client, bucketName, chunkCount);
		const outName = 'out.mp4';
		await s3Client.send(
			new PutObjectCommand({
				Bucket: bucketName,
				Key: 'out.mp4',
				Body: fs.createReadStream(out),
				ACL: 'public-read',
			})
		);
		console.log(
			'Done! ' + `https://s3.${REGION}.amazonaws.com/${bucketName}/${outName}`
		);
	} else if (params.type === 'renderer') {
		if (typeof params.chunk !== 'number') {
			throw new Error('must pass chunk');
		}
		if (!params.frameRange) {
			throw new Error('must pass framerange');
		}
		console.log(
			`Started rendering ${params.chunk}, frame ${params.frameRange}`
		);
		await renderFrames({
			compositionId: params.composition,
			config: {
				durationInFrames: params.durationInFrames,
				fps: params.fps,
				height: params.height,
				width: params.width,
			},
			imageFormat: 'jpeg',
			inputProps: {},
			frameRange: params.frameRange,
			onFrameUpdate: (i: number, output: string) => {
				console.log('Rendered frames', i, output);
			},
			parallelism: 2,
			onStart: () => {
				console.log('Starting');
			},
			outputDir,
			puppeteerInstance: browserInstance,
			serveUrl: params.serveUrl,
		});
		const outdir = `tmp/${Math.random()}`;
		fs.mkdirSync(outdir);

		const outputLocation = path.join(outdir, 'out.mp4');
		console.log(outputLocation);

		await stitchFramesToVideo({
			assetsInfo: {
				// TODO
				assets: [],
				bundleDir: '',
			},
			dir: outputDir,
			force: true,
			fps: params.fps,
			height: params.height,
			width: params.width,
			outputLocation,
			// TODO
			codec: 'h264',
			// TODO
			imageFormat: 'jpeg',
		});
		await s3Client.send(
			new PutObjectCommand({
				Bucket: params.bucketName,
				Key: `chunk-${String(params.chunk).padStart(8, '0')}.mp4`,
				Body: fs.createReadStream(outputLocation),
			})
		);
		unlinkSync(outputLocation);
		console.log('Done rendering!', outputDir, params.bucketName);
	} else {
		throw new Error('Command not found');
	}
};
