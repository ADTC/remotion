import type {GcpRegion} from '../pricing/gcp-regions';
import {REMOTION_BUCKET_PREFIX} from '../shared/constants';
import {makeBucketName} from '../shared/validate-bucketname';
import {createBucket} from './create-bucket';
import {getRemotionStorageBuckets} from './get-buckets';

export type GetOrCreateBucketInput = {
	region: GcpRegion;
	updateBucketState?: (
		state:
			| 'Checking for existing bucket'
			| 'Creating new bucket'
			| 'Created bucket'
			| 'Using existing bucket'
	) => void;
};

export type GetOrCreateBucketOutput = {
	bucketName: string;
};
/**
 * @description Creates a bucket for Remotion Cloud Run in your GCP Project, in a particular region. If one already exists, it will get returned instead.
 * @link https://remotion.dev/docs/cloudrun/getorcreatebucket
 * @param options.region The region in which you want your Storage bucket to reside in.
 * @returns {Promise<GetOrCreateBucketOutput>} An object containing the `bucketName`.
 */
export const getOrCreateBucket = async (
	options: GetOrCreateBucketInput
): Promise<GetOrCreateBucketOutput> => {
	const {remotionBuckets} = await getRemotionStorageBuckets(options.region);

	if (remotionBuckets.length > 1) {
		throw new Error(
			`You have multiple buckets (${remotionBuckets.map(
				(b) => b.name
			)}) starting with "${REMOTION_BUCKET_PREFIX}". This is an error, please delete buckets so that you have one maximum.`
		);
	}

	if (remotionBuckets.length === 1) {
		options?.updateBucketState?.('Using existing bucket');
		return {
			bucketName: remotionBuckets[0].name,
		};
	}

	if (options?.region) {
		options.updateBucketState?.('Creating new bucket');

		const bucketName = makeBucketName();
		await createBucket({
			bucketName,
			region: options.region,
		});

		options.updateBucketState?.('Created bucket');

		return {bucketName};
	}

	throw new Error(
		'Bucket creation is required, but no region has been passed.'
	);
};
