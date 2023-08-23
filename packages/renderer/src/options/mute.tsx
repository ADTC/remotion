import { z } from 'zod';
import {AnyRemotionOption} from './option';

export const muteOption = {
	name: 'Muted',
	cliFlag: '--muted',
	description: <>The Audio of the video will be omitted.</>,
	ssrName: 'muted',
	docLink: 'https://www.remotion.dev/docs/using-audio/#muted-property',
	type: z.boolean(),
} satisfies AnyRemotionOption;
