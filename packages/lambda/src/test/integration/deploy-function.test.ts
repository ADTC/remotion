import {deleteFunction} from '../../api/delete-function';
import {deployFunction} from '../../api/deploy-function';
import {getFunctions} from '../../api/get-functions';
import {
	cleanFnStore,
	markFunctionAsIncompatible,
} from '../../api/mock-functions';
import {CURRENT_VERSION} from '../../shared/constants';

const expectedFunctionName = (memory: number, timeout: number, disk: number) =>
	`remotion-render-${CURRENT_VERSION}-mem${memory}mb-disk${disk}mb-${timeout}sec`;

test('Should be able to deploy function', async () => {
	const {functionName} = await deployFunction({
		memorySizeInMb: 2048,
		region: 'us-east-1',
		timeoutInSeconds: 120,
		createCloudWatchLogGroup: true,
		architecture: 'arm64',
	});
	expect(functionName).toBe(expectedFunctionName(2048, 120, 512));
});

test('Should be able to get the function afterwards', async () => {
	cleanFnStore();

	const {functionName} = await deployFunction({
		memorySizeInMb: 2048,
		region: 'us-east-1',
		timeoutInSeconds: 120,
		createCloudWatchLogGroup: true,
		architecture: 'arm64',
	});
	expect(functionName).toBe(expectedFunctionName(2048, 120, 512));
	const fns = await getFunctions({
		region: 'us-east-1',
		compatibleOnly: true,
	});
	expect(fns).toEqual([
		{
			functionName: expectedFunctionName(2048, 120, 512),
			memorySizeInMb: 2048,
			timeoutInSeconds: 120,
			version: CURRENT_VERSION,
			region: 'us-east-1',
		},
	]);
	const foreignFunctions = await getFunctions({
		region: 'us-east-2',
		compatibleOnly: true,
	});
	expect(foreignFunctions).toEqual([]);
});

test('Should be able to delete the function', async () => {
	cleanFnStore();

	const {functionName} = await deployFunction({
		memorySizeInMb: 2048,
		region: 'us-east-1',
		timeoutInSeconds: 120,
		createCloudWatchLogGroup: true,
		architecture: 'arm64',
	});
	expect(functionName).toBe(expectedFunctionName(2048, 120, 512));
	await deleteFunction({
		region: 'us-east-1',
		functionName: expectedFunctionName(2048, 120, 512),
	});
	const fns = await getFunctions({
		region: 'us-east-1',
		compatibleOnly: true,
	});
	expect(fns).toEqual([]);
});

test('Should be able to get the function afterwards', async () => {
	cleanFnStore();

	const {functionName} = await deployFunction({
		memorySizeInMb: 2048,
		region: 'us-east-1',
		timeoutInSeconds: 120,
		createCloudWatchLogGroup: true,
		architecture: 'arm64',
	});
	expect(functionName).toBe(expectedFunctionName(2048, 120, 512));
	const fns = await getFunctions({
		region: 'us-east-1',
		compatibleOnly: true,
	});
	expect(fns).toEqual([
		{
			functionName: expectedFunctionName(2048, 120, 512),
			memorySizeInMb: 2048,
			timeoutInSeconds: 120,
			version: CURRENT_VERSION,
			region: 'us-east-1',
		},
	]);
	markFunctionAsIncompatible(expectedFunctionName(2048, 120, 512));
	const compatibleFns = await getFunctions({
		region: 'us-east-1',
		compatibleOnly: true,
	});
	const incompatibleFns = await getFunctions({
		region: 'us-east-1',
		compatibleOnly: false,
	});
	expect(compatibleFns).toEqual([]);
	expect(incompatibleFns).toEqual([
		{
			functionName: expectedFunctionName(2048, 120, 512),
			memorySizeInMb: 2048,
			timeoutInSeconds: 120,
			version: '2021-06-23',
			region: 'us-east-1',
		},
	]);
});
