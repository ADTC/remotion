import {fireHandler} from '../functions/fire';
import {progressHandler} from '../functions/get-progress';
import {infoHandler} from '../functions/info';
import {launchHandler} from '../functions/launch';
import {rendererHandler} from '../functions/renderer';
import {startHandler} from '../functions/start';
import {LambdaRoutines} from './constants';

export interface LambdaReturnValues {
	[LambdaRoutines.start]: ReturnType<typeof startHandler>;
	[LambdaRoutines.launch]: ReturnType<typeof launchHandler>;
	[LambdaRoutines.renderer]: ReturnType<typeof rendererHandler>;
	[LambdaRoutines.status]: ReturnType<typeof progressHandler>;
	[LambdaRoutines.fire]: ReturnType<typeof fireHandler>;
	[LambdaRoutines.info]: ReturnType<typeof infoHandler>;
}
