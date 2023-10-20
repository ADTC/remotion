import {audioBitrateOption} from './audio-bitrate';
import {colorSpaceOption} from './color-space';
import {crfOption} from './crf';
import {deleteAfterOption} from './delete-after';
import {enableMultiprocessOnLinuxOption} from './enable-multiprocess-on-linux';
import {enforceAudioOption} from './enforce-audio';
import {folderExpiryOption} from './folder-expiry';
import {glOption} from './gl';
import {jpegQualityOption} from './jpeg-quality';
import {muteOption} from './mute';
import {offthreadVideoCacheSizeInBytesOption} from './offthreadvideo-cache-size';
import {scaleOption} from './scale';
import {videoBitrate} from './video-bitrate';
import {videoCodecOption} from './video-codec';
import {webhookCustomDataOption} from './webhook-custom-data';

export const allOptions = {
	scaleOption,
	crfOption,
	jpegQualityOption,
	videoBitrate,
	audioBitrateOption,
	enforceAudioOption,
	muteOption,
	videoCodecOption,
	offthreadVideoCacheSizeInBytesOption,
	webhookCustomDataOption,
	colorSpaceOption,
	deleteAfterOption,
	folderExpiryOption,
	enableMultiprocessOnLinuxOption,
	glOption,
};
