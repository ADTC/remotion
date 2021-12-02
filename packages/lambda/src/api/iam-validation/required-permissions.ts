import {iam, lambda, logs, s3} from 'aws-policies';
import {REMOTION_BUCKET_PREFIX, RENDER_FN_PREFIX} from '../../shared/constants';

// TODO: Update docs before release
export const requiredPermissions: {
	actions: (s3 | iam | lambda | logs)[];
	resource: string[];
}[] = [
	{
		actions: [iam.GetUser],
		// eslint-disable-next-line no-template-curly-in-string
		resource: ['arn:aws:iam::*:user/${aws:username}'],
	},
	{
		actions: [iam.SimulatePrincipalPolicy],
		resource: ['*'],
	},
	{
		actions: [iam.PassRole],
		resource: ['arn:aws:iam:::role/remotion-lambda-role'],
	},
	{
		actions: [
			s3.GetObject,
			s3.DeleteObject,
			s3.DeleteBucket,
			s3.PutBucketWebsite,
			s3.DeleteBucketWebsite,
			s3.PutObjectAcl,
			s3.PutObject,
			s3.GetBucketLocation,
		],
		resource: [`arn:aws:s3:::${REMOTION_BUCKET_PREFIX}*`],
	},
	{
		actions: [s3.CreateBucket, s3.ListBucket, s3.PutBucketAcl],
		resource: [`arn:aws:s3:::*`],
	},
	{
		actions: [s3.ListAllMyBuckets],
		resource: ['*'],
	},
	{
		actions: [
			lambda.GetFunction,
			lambda.InvokeAsync,
			lambda.InvokeFunction,
			lambda.CreateFunction,
			lambda.DeleteFunction,
			lambda.PutFunctionEventInvokeConfig,
		],
		resource: [`arn:aws:lambda:*:*:function:${RENDER_FN_PREFIX}*`],
	},
	{
		actions: [lambda.GetLayerVersion],
		// TODO: Tighten up
		resource: [`*`],
	},
	{
		actions: [lambda.ListFunctions],
		resource: ['*'],
	},
	{
		actions: [logs.CreateLogGroup, logs.PutRetentionPolicy],
		resource: ['*'],
	},
];
