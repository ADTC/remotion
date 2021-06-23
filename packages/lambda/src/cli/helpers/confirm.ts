import prompt from 'prompt';
import {parsedLambdaCli} from '../args';

export const confirmCli = async ({
	delMessage,
	allowForceFlag,
}: {
	delMessage: string;
	allowForceFlag: boolean;
}) => {
	prompt.message = '';
	prompt.start();

	if (allowForceFlag && parsedLambdaCli.force) {
		return;
	}

	let didAnswer = false;
	while (!didAnswer) {
		const result = await prompt.get([delMessage]);

		if ((result[delMessage] as string).toLowerCase() === 'y') {
			didAnswer = true;
		}

		if ((result[delMessage] as string).trim() === '') {
			didAnswer = true;
		}

		if ((result[delMessage] as string).trim() === 'n') {
			process.exit(1);
		}
	}
};
