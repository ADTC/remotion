import execa from 'execa';
import fs from 'fs';
import path from 'path';

const npmOrYarn = (): 'npm' | 'yarn' => {
	const packageLockJsonFilePath = path.join(process.cwd(), 'package-lock.json');
	const yarnLockFilePath = path.join(process.cwd(), 'yarn.lock');

	const npmExists = fs.existsSync(packageLockJsonFilePath);
	const yarnExists = fs.existsSync(yarnLockFilePath);

	if (npmExists && !yarnExists) {
		return 'npm';
	}
	if (!npmExists && yarnExists) {
		return 'yarn';
	}
	if (npmExists && yarnExists) {
		console.log(
			'Found both a package-lock.json and a yarn.lock file in your project.'
		);
		console.log(
			'This can lead to bugs, delete one of the two files and settle on 1 package manager.'
		);
		console.log('Afterwards, run this command again.');
		process.exit(1);
	}
	console.log('Did not find a package-lock.json or yarn.lock file.');
	console.log('Cannot determine how to update dependencies.');
	console.log('Did you run `npm install` yet?');
	console.log('Make sure either file exists and run this command again.');
	process.exit(1);
};

export const upgrade = async () => {
	const packageJsonFilePath = path.join(process.cwd(), 'package.json');
	if (!fs.existsSync(packageJsonFilePath)) {
		console.log(
			'Could not upgrade because no package.json could be found in your project.'
		);
		process.exit(1);
	}
	// eslint-disable-next-line import/no-dynamic-require
	const packageJson = require(packageJsonFilePath);
	const dependencies = Object.keys(packageJson['dependencies']);

	const tool = npmOrYarn();

	const toUpgrade = [
		'@remotion/bundler',
		'@remotion/cli',
		'@remotion/eslint-config',
		'@remotion/renderer',
		'remotion',
	].filter((u) => dependencies.includes(u));

	const prom = execa(tool, ['upgrade', ...toUpgrade]);
	prom.stdout?.pipe(process.stdout);
	await prom;
	console.log('⏫ Remotion has been upgraded!');
};
