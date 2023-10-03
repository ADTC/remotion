import React from 'react';
import {formatBytes} from '../../format-bytes';
import type {AssetMetadata} from '../helpers/get-asset-metadata';
import {JSONViewer} from './JSONViewer';
import {Spacing} from './layout';
import type {AssetFileType} from './Preview';
import {TextViewer} from './TextViewer';

const msgStyle: React.CSSProperties = {
	fontSize: 13,
	color: 'white',
	fontFamily: 'sans-serif',
	display: 'flex',
	justifyContent: 'center',
};

export const FilePreview: React.FC<{
	src: string;
	fileType: AssetFileType;
	currentAsset: string;
	assetMetadata: AssetMetadata | null;
}> = ({fileType, src, currentAsset, assetMetadata}) => {
	if (!assetMetadata) {
		throw new Error('expected to have assetMetadata');
	}

	if (assetMetadata.type === 'not-found') {
		throw new Error('expected to have assetMetadata, got "not-found"');
	}

	if (fileType === 'audio') {
		return (
			<div>
				<audio src={src} controls />
			</div>
		);
	}

	if (fileType === 'video') {
		return <video src={src} controls />;
	}

	if (fileType === 'image') {
		return <img src={src} />;
	}

	if (fileType === 'json') {
		return <JSONViewer src={src} />;
	}

	if (fileType === 'txt') {
		return <TextViewer src={src} />;
	}

	return (
		<>
			<div style={msgStyle}>{currentAsset}</div>
			<Spacing y={0.5} />
			<div style={msgStyle}>Size: {formatBytes(assetMetadata.size)} </div>
		</>
	);
};
