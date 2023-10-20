import {
	defaultAudioCodecs,
	supportedAudioCodecs,
	validAudioCodecs,
} from './audio-codec';
import {validCodecs} from './codec';
import {
	codecSupportsCrf,
	codecSupportsVideoBitrate,
} from './codec-supports-media';
import {getDefaultCrfForCodec, getValidCrfRanges} from './crf';
import {defaultFileExtensionMap} from './file-extensions';
import {
	defaultCodecsForFileExtension,
	getFileExtensionFromCodec,
} from './get-extension-from-codec';
import {isAudioCodec} from './is-audio-codec';
import {allOptions} from './options';
import {validColorSpaces} from './options/color-space';
import {optionsMap} from './options/options-map';
import {DEFAULT_PIXEL_FORMAT, validPixelFormats} from './pixel-format';
import {proResProfileOptions} from './prores-profile';
import {validateOutputFilename} from './validate-output-filename';
import {x264PresetOptions} from './x264-preset';

export const BrowserSafeApis = {
	getFileExtensionFromCodec,
	validCodecs,
	validAudioCodecs,
	getDefaultCrfForCodec,
	getValidCrfRanges,
	isAudioCodec,
	proResProfileOptions,
	x264PresetOptions,
	validPixelFormats,
	DEFAULT_PIXEL_FORMAT,
	supportedAudioCodecs,
	defaultFileExtensionMap,
	defaultAudioCodecs,
	defaultCodecsForFileExtension,
	validateOutputFilename,
	options: allOptions,
	validColorSpaces,
	optionsMap,
	codecSupportsCrf,
	codecSupportsVideoBitrate,
};
