import type {LambdaClient} from '@aws-sdk/client-lambda';

import {ResponseStream} from '@remotion/serverless';
import type {getLambdaClient as original} from '../../shared/aws-clients';
import {mockImplementation} from '../../test/mock-implementation';

export const getLambdaClient: typeof original = (_region, timeoutInTest) => {
	return {
		config: {
			requestHandler: {},
			apiVersion: 'fake',
		},
		destroy: () => undefined,
		middlewareStack: undefined,
		send: async (params: {
			input: {
				FunctionName: undefined;
				Payload: string;
				InvocationType: 'Event' | 'RequestResponse' | undefined;
			};
		}) => {
			const payload = JSON.parse(params.input.Payload);

			const {innerRoutine} = await import('../../functions/index');

			const responseStream = new ResponseStream();
			const prom = innerRoutine(
				payload,
				responseStream,
				{
					invokedFunctionArn: 'arn:fake',
					getRemainingTimeInMillis: () => timeoutInTest ?? 120000,
					awsRequestId: 'fake',
				},
				mockImplementation,
			);
			if (
				params.input.InvocationType === 'RequestResponse' ||
				params.input.InvocationType === 'Event'
			) {
				await prom;
				return {Payload: responseStream.getBufferedData()};
			}

			prom.then(() => {
				responseStream._finish();
				responseStream.end();
			});
			// When streaming, we should not consume the response
			return {
				EventStream: responseStream,
			};
		},
	} as unknown as LambdaClient;
};
