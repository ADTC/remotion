import {CreateFunctionCommand} from '@aws-sdk/client-lambda';
import {readFileSync} from 'fs';
import {AwsRegion} from '..';
import {getLambdaClient} from '../shared/aws-clients';

export const createFunction = async ({
	region,
	zipFile,
	functionName,
	accountId,
	memorySizeInMb,
	timeoutInSeconds,
}: {
	region: AwsRegion;
	zipFile: string;
	functionName: string;
	accountId: string;
	memorySizeInMb: number;
	timeoutInSeconds: number;
}) => {
	const {FunctionName} = await getLambdaClient(region).send(
		new CreateFunctionCommand({
			Code: {
				// TODO: Put it in S3 bucket
				ZipFile: readFileSync(zipFile),
			},
			FunctionName: functionName,
			Handler: 'index.handler',
			// TODO: Give helpful suggestion if user did not create role
			Role: `arn:aws:iam::${accountId}:role/remotion-lambda-role`,
			Runtime: 'nodejs14.x',
			Description: 'Renders a Remotion video.',
			MemorySize: memorySizeInMb,
			Timeout: timeoutInSeconds,
			Layers: [
				// TODO: Unhardcode
				'arn:aws:lambda:eu-central-1:976210361945:layer:remotion-binaries-chromium:14',
				'arn:aws:lambda:eu-central-1:976210361945:layer:remotion-binaries-remotion:14',
			],
		})
	);
	return {FunctionName};
};
