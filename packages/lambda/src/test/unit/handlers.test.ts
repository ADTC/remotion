import {expect, test} from 'vitest';
import {LambdaRoutines} from '../../shared/constants';
import {callLambda} from '../../shared/call-lambda';

test('Info handler should return version', async () => {
	const response = await callLambda({
		type: LambdaRoutines.info,
		payload: {},
		functionName: 'remotion-dev-lambda',
		receivedStreamingPayload: () => undefined,
		region: 'us-east-1',
		timeoutInTest: 120000,
	});

	expect(typeof response.version === 'string').toBe(true);
});
