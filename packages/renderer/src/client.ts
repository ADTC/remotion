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
import {audioBitrateOption} from './options/audio-bitrate';
import {crfOption} from './options/crf';
import {enforceAudioOption} from './options/enforce-audio';
import {jpegQualityOption} from './options/jpeg-quality';
import {muteOption} from './options/mute';
import {scaleOption} from './options/scale';
import {videoBitrate} from './options/video-bitrate';
import {videoCodecOption} from './options/video-codec';
import {DEFAULT_PIXEL_FORMAT, validPixelFormats} from './pixel-format';
import {presetsProfileOptions} from './presets-profile';
import {proResProfileOptions} from './prores-profile';
import {validateOutputFilename} from './validate-output-filename';

export const BrowserSafeApis = {
	getFileExtensionFromCodec,
	validCodecs,
	validAudioCodecs,
	getDefaultCrfForCodec,
	getValidCrfRanges,
	isAudioCodec,
	proResProfileOptions,
	presetsProfileOptions,
	validPixelFormats,
	DEFAULT_PIXEL_FORMAT,
	supportedAudioCodecs,
	defaultFileExtensionMap,
	defaultAudioCodecs,
	defaultCodecsForFileExtension,
	validateOutputFilename,
	options: {
		scaleOption,
		crfOption,
		jpegQualityOption,
		videoBitrate,
		audioBitrateOption,
		enforceAudioOption,
		muteOption,
		videoCodecOption,
	},
	codecSupportsCrf,
	codecSupportsVideoBitrate,
};
