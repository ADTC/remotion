import {RenderInternals} from '@remotion/renderer';
import {Await} from '../../shared/await';
import {executablePath} from './get-chromium-executable-path';

let _browserInstance: Await<
	ReturnType<typeof RenderInternals.openBrowser>
> | null;

let launching = false;

const waitForLaunched = () => {
	return new Promise<void>((resolve, reject) => {
		const check = () =>
			setTimeout(() => {
				if (launching) {
					resolve();
				} else {
					check();
				}
			}, 16);

		setTimeout(() => reject(new Error('Timeout launching browser')), 5000);
		check();
	});
};

export const getBrowserInstance = async (): ReturnType<
	typeof RenderInternals.openBrowser
> => {
	if (launching) {
		await waitForLaunched();
	}

	if (_browserInstance) {
		return _browserInstance;
	}

	launching = true;

	const execPath = await executablePath();
	_browserInstance = await RenderInternals.openBrowser('chrome', {
		customExecutable: execPath,
	});
	launching = false;
	return _browserInstance;
};
