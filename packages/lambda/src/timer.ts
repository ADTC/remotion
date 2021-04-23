import chalk from 'chalk';

const formatTime = (time: number) => {
	if (time < 200) {
		return chalk.green(time + 'ms');
	}
	if (time < 500) {
		return chalk.yellow(time + 'ms');
	}
	return chalk.red(time + 'ms');
};

export const timer = (label: string) => {
	const start = Date.now();
	process.stdout.write(label + '...');

	return () => {
		const end = Date.now();
		const time = end - start;

		process.stdout.write(` ${formatTime(time)}\n`);
	};
};
