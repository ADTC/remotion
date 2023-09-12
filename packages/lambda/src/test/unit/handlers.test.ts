import {expect, test} from 'vitest';
import {callLambda} from '../../shared/call-lambda';
import {LambdaRoutines} from '../../shared/constants';

test('Info handler should return version', async () => {
	const response = await callLambda({
		type: LambdaRoutines.info,
		payload: {},
		functionName: 'remotion-dev-lambda',
		onMessage: () => undefined,
		region: 'us-east-1',
		timeoutInTest: 120000,
		retriesRemaining: 0,
	});

	expect(typeof response.version === 'string').toBe(true);
});
