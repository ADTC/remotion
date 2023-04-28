import {CliInternals} from '@remotion/cli';
import type {RenderStillOnCloudrunOutput} from '../../../api/render-still-on-cloudrun';
import {renderStillOnCloudrun} from '../../../api/render-still-on-cloudrun';
import {Log} from '../../log';
import {renderArgsCheck} from './helpers/renderArgsCheck';

export const RENDER_STILL_SUBCOMMAND = 'still';

export const renderStillSubcommand = async (
	args: string[],
	remotionRoot: string
) => {
	const {
		serveUrl,
		cloudRunUrl,
		composition,
		outName,
		inputProps,
		outputBucket,
		authenticatedRequest,
	} = await renderArgsCheck(RENDER_STILL_SUBCOMMAND, args, remotionRoot);

	// Todo: Check cloudRunUrl is valid, as the error message is obtuse
	CliInternals.Log.info(
		CliInternals.chalk.gray(
			`
Sending request to Cloud Run:

    Cloud Run Service URL = ${cloudRunUrl}
    Authenticated Request = ${authenticatedRequest}
    Type = still
    Composition = ${composition}
    Output Bucket = ${outputBucket}
    Output File = ${outName}
			`.trim()
		)
	);
	Log.info();

	const renderStart = Date.now();
	const progressBar = CliInternals.createOverwriteableCliOutput({
		quiet: CliInternals.quietFlagProvided(),
		cancelSignal: null,
	});

	type DoneIn = number | null;

	let doneIn: DoneIn = null;

	const updateProgress = () => {
		progressBar.update(
			[
				`Rendering on Cloud Run: `,
				`${doneIn === null ? '...' : `Rendered in ${doneIn}ms`}`,
			].join(' ')
		);
	};

	const res = await renderStillOnCloudrun({
		authenticatedRequest,
		cloudRunUrl,
		// serviceName,
		serveUrl,
		composition,
		inputProps,
		outputBucket,
		outputFile: outName,
	});
	doneIn = Date.now() - renderStart;
	updateProgress();

	const success = res as RenderStillOnCloudrunOutput;
	Log.info(`
		
		`);
	Log.info(
		CliInternals.chalk.blueBright(
			`
🤘 Rendered on Cloud Run! 🤘

    Public URL = ${success.publicUrl}
    Cloud Storage Uri = ${success.cloudStorageUri}
    Size (KB) = ${Math.round(Number(success.size) / 1000)}
    Bucket Name = ${success.bucketName}
    Render ID = ${success.renderId}
      `.trim()
		)
	);
};
