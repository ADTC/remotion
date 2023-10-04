import React, {useCallback, useContext, useEffect, useMemo} from 'react';
import type {StaticFile} from 'remotion';
import {getStaticFiles} from 'remotion';
import {subscribeToEvent} from '../../event-source';
import {BACKGROUND, LIGHT_TEXT} from '../helpers/colors';
import {buildAssetFolderStructure} from '../helpers/create-folder-tree';
import type {ExpandedFoldersState} from '../helpers/persist-open-folders';
import {persistExpandedFolders} from '../helpers/persist-open-folders';
import {FolderContext} from '../state/folders';
import {useZIndex} from '../state/z-index';
import {AssetFolderTree} from './AssetSelectorItem';
import {inlineCodeSnippet} from './Menu/styles';

const container: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	flex: 1,
	overflow: 'hidden',
	backgroundColor: BACKGROUND,
};

// Some redundancy with packages/cli/src/editor/components/RenderModal/SchemaEditor/SchemaErrorMessages.tsx
const emptyState: React.CSSProperties = {
	display: 'flex',
	flex: 1,
	justifyContent: 'center',
	alignItems: 'center',
	textAlign: 'center',
	padding: '0 12px',
};

const label: React.CSSProperties = {
	color: LIGHT_TEXT,
	lineHeight: 1.5,
	fontSize: 14,
};

const list: React.CSSProperties = {
	height: '100%',
	overflowY: 'auto',
};

type State = {
	staticFiles: StaticFile[];
	publicFolderExists: string | null;
};

export const AssetSelector: React.FC = () => {
	const {tabIndex} = useZIndex();
	const {assetFoldersExpanded, setAssetFoldersExpanded} =
		useContext(FolderContext);

	const [{publicFolderExists, staticFiles}, setState] = React.useState<State>(
		() => {
			return {
				staticFiles: getStaticFiles(),
				publicFolderExists: window.remotion_publicFolderExists,
			};
		},
	);

	const assetTree = useMemo(() => {
		return buildAssetFolderStructure(staticFiles, null, assetFoldersExpanded);
	}, [assetFoldersExpanded, staticFiles]);

	useEffect(() => {
		const onUpdate = () => {
			setState({
				staticFiles: getStaticFiles(),
				publicFolderExists: window.remotion_publicFolderExists,
			});
		};

		const unsub = subscribeToEvent('new-public-folder', onUpdate);
		return () => {
			unsub();
		};
	}, []);

	const toggleFolder = useCallback(
		(folderName: string, parentName: string | null) => {
			setAssetFoldersExpanded((p) => {
				const key = [parentName, folderName].filter(Boolean).join('/');

				const prev = p[key] ?? false;
				const foldersExpandedState: ExpandedFoldersState = {
					...p,
					[key]: !prev,
				};
				persistExpandedFolders('assets', foldersExpandedState);
				return foldersExpandedState;
			});
		},
		[setAssetFoldersExpanded],
	);

	return (
		<div style={container}>
			{staticFiles.length === 0 ? (
				publicFolderExists ? (
					<div style={emptyState}>
						<div style={label}>
							To add assets, place a file in the{' '}
							<code style={inlineCodeSnippet}>public</code> folder of your
							project.
						</div>
					</div>
				) : (
					<div style={emptyState}>
						<div style={label}>
							To add assets, create a folder called{' '}
							<code style={inlineCodeSnippet}>public</code> in the root of your
							project and place a file in it.
						</div>
					</div>
				)
			) : (
				<div className="__remotion-vertical-scrollbar" style={list}>
					<AssetFolderTree
						item={assetTree}
						level={0}
						parentFolder={null}
						name={null}
						tabIndex={tabIndex}
						toggleFolder={toggleFolder}
					/>
				</div>
			)}
		</div>
	);
};
