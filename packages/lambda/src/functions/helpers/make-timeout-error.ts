import type {
	CloudProvider,
	EnhancedErrorInfo,
	ProviderSpecifics,
} from '@remotion/serverless';
import type {RenderMetadata} from '@remotion/serverless/client';
import {makeTimeoutMessage} from './make-timeout-message';

export const makeTimeoutError = <Provider extends CloudProvider>({
	timeoutInMilliseconds,
	missingChunks,
	renderMetadata,
	renderId,
	providerSpecifics,
}: {
	timeoutInMilliseconds: number;
	renderMetadata: RenderMetadata<Provider>;
	renderId: string;
	missingChunks: number[];
	providerSpecifics: ProviderSpecifics<Provider>;
}): EnhancedErrorInfo => {
	const message = makeTimeoutMessage({
		missingChunks,
		renderMetadata,
		timeoutInMilliseconds,
		renderId,
		providerSpecifics,
	});

	const error = new Error(message);

	return {
		attempt: 1,
		chunk: null,
		explanation: null,
		frame: null,
		isFatal: true,
		s3Location: '',
		stack: error.stack as string,
		tmpDir: null,
		totalAttempts: 1,
		type: 'stitcher',
		willRetry: false,
		message,
		name: 'TimeoutError',
	};
};
