import {RenderInternals} from '@remotion/renderer';
import {expect, test} from 'bun:test';
import {nodeReader} from '../from-node';
import {getVideoMetadata} from '../get-video-metadata';

test('Parse Big Buck bunny', async () => {
	const data = await getVideoMetadata(
		RenderInternals.exampleVideos.bigBuckBunny,
		{
			boxes: true,
		},
		nodeReader,
	);
	expect(data.boxes.slice(0, 2)).toEqual([
		{
			offset: 0,
			boxSize: 32,
			type: 'ftyp-box',
			majorBrand: 'isom',
			minorVersion: 512,
			compatibleBrands: ['isom', 'iso2', 'avc1', 'mp41'],
		},
		{
			offset: 32,
			boxSize: 8,
			boxType: 'free',
			type: 'regular-box',
			children: [],
		},
	]);
});

test('Parse an iPhone video', async () => {
	const data = await getVideoMetadata(
		RenderInternals.exampleVideos.iphonevideo,
		{durationInSeconds: true, dimensions: true},
		nodeReader,
	);

	expect(data.durationInSeconds).toBe(12.568333333333333);
	expect(data.dimensions).toEqual({
		width: 3840,
		height: 2160,
	});
});

test('Parse framer', async () => {
	const parsed = await getVideoMetadata(
		RenderInternals.exampleVideos.framerWithoutFileExtension,
		{
			boxes: true,
		},
		nodeReader,
	);
	expect(parsed.boxes.slice(0, 2)).toEqual([
		{
			offset: 0,
			boxSize: 32,
			compatibleBrands: ['isom', 'iso2', 'avc1', 'mp41'],
			majorBrand: 'isom',
			minorVersion: 512,
			type: 'ftyp-box',
		},
		{
			offset: 32,
			boxSize: 8,
			boxType: 'free',
			type: 'regular-box',
			children: [],
		},
	]);
});

test('Parse a full video', async () => {
	const data = await getVideoMetadata(
		RenderInternals.exampleVideos.framer24fps,
		{boxes: true},
		nodeReader,
	);
	if (!data) throw new Error('No data');

	const [first, second, third] = data.boxes;

	expect(first).toEqual({
		offset: 0,
		boxSize: 32,
		type: 'ftyp-box',
		majorBrand: 'isom',
		minorVersion: 512,
		compatibleBrands: ['isom', 'iso2', 'avc1', 'mp41'],
	});
	expect(second).toEqual({
		offset: 32,
		boxType: 'free',
		boxSize: 8,
		type: 'regular-box',
		children: [],
	});
	expect(third).toEqual({
		offset: 40,
		boxSize: 57014,
		boxType: 'mdat',
		children: [],
		type: 'regular-box',
	});
});

test('Should warn if missing node reader', () => {
	const data = getVideoMetadata(RenderInternals.exampleVideos.framer24fps, {
		boxes: true,
	});
	expect(data).rejects.toThrow(/node/);
});
