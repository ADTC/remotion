import got from 'got/dist/source';
import {validateCloudRunUrl} from '../shared/validate-cloudrun-url';
import type {CloudrunCodec} from '../shared/validate-gcp-codec';
import {validateCloudrunCodec} from '../shared/validate-gcp-codec';
import {validateServeUrl} from '../shared/validate-serveurl';
import {getAuthClientForUrl} from './helpers/get-auth-client-for-url';
import {parseCloudRunUrl} from './helpers/parse-cloud-run-url';

export type RenderMediaOnCloudrunInput = {
	authenticatedRequest: boolean;
	cloudRunUrl: string;
	// serviceName?: string;
	serveUrl: string;
	composition: string;
	inputProps?: unknown;
	codec: CloudrunCodec;
	outputBucket: string;
	outputFile: string;
	updateRenderProgress?: (progress: number) => void;
};

export type RenderMediaOnCloudrunOutput = {
	authenticatedRequest: boolean;
	publicUrl: string;
	cloudStorageUri: string;
	size: string;
	bucketName: string;
	renderId: string;
	status: string;
	errMessage: string;
	error: any;
};

export type RenderMediaOnCloudrunErrOutput = {
	message: string;
	error: any;
	status: string;
};

/**
 * @description Triggers a render on a GCP Cloud Run service given a composition and a Cloud Run URL.
 * @see [Documentation](https://remotion.dev/docs/lambda/renderMediaOnGcp)
 * @param params.authenticatedRequest If this is an authenticated request, .env file will be checked for GCP credentials
 * @param params.cloudRunUrl The url of the Cloud Run service that should be used
 * @param params.serviceName The name of the Cloud Run service that should be used
 * @param params.serveUrl The URL of the deployed project
 * @param params.composition The ID of the composition which should be rendered.
 * @param params.inputProps The input props that should be passed to the composition.
 * @param params.codec The media codec which should be used for encoding.
 * @param params.outputBucket The name of the GCP Storage Bucket that will store the rendered media output.
 * @param params.outputFolderPath The folder path of the GCP Storage Bucket that will store the rendered media output.
 * @param params.outName The file name of the rendered media output.
 * @returns {Promise<RenderMediaOnCloudrunOutput>} See documentation for detailed structure
 */

export const renderMediaOnCloudrun = async ({
	authenticatedRequest,
	cloudRunUrl,
	// serviceName,
	serveUrl,
	composition,
	inputProps,
	codec,
	outputBucket,
	outputFile,
	updateRenderProgress,
}: RenderMediaOnCloudrunInput): Promise<any> => {
	const actualCodec = validateCloudrunCodec(codec);
	validateServeUrl(serveUrl);
	validateCloudRunUrl(cloudRunUrl);

	const cloudRunInfo = parseCloudRunUrl(cloudRunUrl);

	// todo: allow serviceName to be passed in, and fetch the cloud run URL based on the name

	const data = {
		type: 'media',
		composition,
		serveUrl,
		codec: actualCodec,
		inputProps,
		outputBucket,
		outputFile,
	};

	if (authenticatedRequest) {
		const client = await getAuthClientForUrl(cloudRunUrl);

		const dataPromise = new Promise((resolve, reject) => {
			let response = {};
			client
				.request({
					url: cloudRunUrl,
					method: 'POST',
					data,
					responseType: 'stream',
				})
				.then((postResponse) => {
					const stream: any = postResponse.data;

					stream.on('data', (chunk: Buffer) => {
						const chunkResponse = JSON.parse(chunk.toString());
						if (chunkResponse.response) {
							response = chunkResponse.response;
						} else if (chunkResponse.onProgress) {
							updateRenderProgress?.(chunkResponse.onProgress);
						}
					});

					stream.on('end', () => {
						resolve(response);
					});

					stream.on('error', (error: any) => {
						reject(error);
					});
				});
		});

		try {
			const response = await dataPromise;
			return response;
		} catch (e) {
			return {
				// TODO: How do we get the project ID?
				message: `Cloud Run Service failed. View logs at https://console.cloud.google.com/run/detail/${cloudRunInfo.region}/${cloudRunInfo.serviceName}/logs?project={PROJECT_ID}`,
				error: e,
				status: 'error',
			};
		}
	} else {
		const dataPromise = new Promise((resolve, reject) => {
			let response = {};
			got.stream
				.post(cloudRunUrl, {json: data})
				.on('data', (chunk) => {
					const chunkResponse = JSON.parse(chunk.toString());
					if (chunkResponse.response) {
						response = chunkResponse.response;
					} else if (chunkResponse.onProgress) {
						updateRenderProgress?.(chunkResponse.onProgress);
					}
				})
				.on('end', () => {
					resolve(response);
				})
				.on('error', (error) => {
					reject(error);
				});
		});

		try {
			const response = await dataPromise;
			return response;
		} catch (e) {
			return {
				// TODO: How do we get the project ID?
				message: `Cloud Run Service failed. View logs at https://console.cloud.google.com/run/detail/${cloudRunInfo.region}/${cloudRunInfo.serviceName}/logs?project={PROJECT_ID}`,
				error: e,
				status: 'error',
			};
		}
	}
};
