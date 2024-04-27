import {execSync} from 'child_process';

const functionName = execSync(`pnpm exec remotion lambda functions ls -q`)
	.toString('utf8')
	.trim()
	.split(' ')[0];

console.log('=== Golang ===');
execSync(`go run main.go`, {
	env: {
		// eslint-disable-next-line no-undef
		...process.env,
		REMOTION_APP_REGION: 'eu-central-1',
		REMOTION_APP_FUNCTION_NAME: functionName,
		REMOTION_APP_SERVE_URL: 'testbed-v6',
	},
	cwd: '../lambda-go-example',
	stdio: 'inherit',
});
console.log('=== PHP ===');
execSync(`php src/render.php`, {
	env: {
		// eslint-disable-next-line no-undef
		...process.env,
		REMOTION_APP_REGION: 'eu-central-1',
		REMOTION_APP_FUNCTION_NAME: functionName,
		REMOTION_APP_SERVE_URL: 'testbed-v6',
	},
	cwd: '../lambda-php-example',
	stdio: 'inherit',
});

console.log('=== Python(render media) ===');
execSync(`python testclient_render_media.py`, {
	env: {
		// eslint-disable-next-line no-undef
		...process.env,
		REMOTION_APP_REGION: 'eu-central-1',
		REMOTION_APP_FUNCTION_NAME: functionName,
		REMOTION_APP_SERVE_URL: 'testbed-v6',
	},
	cwd: '../lambda-python',
	stdio: 'inherit',
});

console.log('=== Python(render still) ===');
execSync(`python testclient_render_still.py`, {
	env: {
		// eslint-disable-next-line no-undef
		...process.env,
		REMOTION_APP_REGION: 'eu-central-1',
		REMOTION_APP_FUNCTION_NAME: functionName,
		REMOTION_APP_SERVE_URL: 'testbed-v6',
	},
	cwd: '../lambda-python',
	stdio: 'inherit',
});
