import {expect, test} from 'vitest';
import {getZTypesIfPossible} from '../editor/components/get-zod-if-possible';

const getZColor = async () => {
	const z = await getZTypesIfPossible();
	if (!z) {
		throw new Error('@remotion/zod-types not found');
	}

	return z;
};

test('Color math', async () => {
	const mod = await getZColor();
	expect(mod.ZodZypesInternals.parseColor('rgba(255, 255, 255, 0.5)')).toEqual({
		a: 128,
		r: 255,
		b: 255,
		g: 255,
	});
});
