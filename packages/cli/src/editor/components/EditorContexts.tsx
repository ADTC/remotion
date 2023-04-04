import {PlayerInternals} from '@remotion/player';
import React, {useCallback, useMemo, useState} from 'react';
import type {
	MediaVolumeContextValue,
	SetMediaVolumeContextValue,
} from 'remotion';
import {Internals} from 'remotion';
import {PreviewServerConnection} from '../helpers/client-id';
import {
	CheckerboardContext,
	loadCheckerboardOption,
	persistCheckerboardOption,
} from '../state/checkerboard';
import {
	EditorZoomGesturesContext,
	loadEditorZoomGesturesOption,
	persistEditorZoomGesturesOption,
} from '../state/editor-zoom-gestures';
import {FolderContextProvider} from '../state/folders';
import {HighestZIndexProvider} from '../state/highest-z-index';
import {KeybindingContextProvider} from '../state/keybindings';
import type {ModalContextType, ModalState} from '../state/modals';
import {ModalsContext} from '../state/modals';
import {loadMuteOption} from '../state/mute';
import {PreviewSizeProvider} from '../state/preview-size';

import {SidebarContextProvider} from '../state/sidebar';
import {RenderQueueContextProvider} from './RenderQueue/context';
import {SetTimelineInOutProvider} from './SetTimelineInOutProvider';

export const EditorContexts: React.FC<{
	children: React.ReactNode;
}> = ({children}) => {
	const [emitter] = useState(() => new PlayerInternals.PlayerEmitter());

	const [checkerboard, setCheckerboardState] = useState(() =>
		loadCheckerboardOption()
	);
	const setCheckerboard = useCallback(
		(newValue: (prevState: boolean) => boolean) => {
			setCheckerboardState((prevState) => {
				const newVal = newValue(prevState);
				persistCheckerboardOption(newVal);
				return newVal;
			});
		},
		[]
	);
	const [editorZoomGestures, setEditorZoomGesturesState] = useState(() =>
		loadEditorZoomGesturesOption()
	);
	const setEditorZoomGestures = useCallback(
		(newValue: (prevState: boolean) => boolean) => {
			setEditorZoomGesturesState((prevState) => {
				const newVal = newValue(prevState);
				persistEditorZoomGesturesOption(newVal);
				return newVal;
			});
		},
		[]
	);

	const [mediaMuted, setMediaMuted] = useState<boolean>(() => loadMuteOption());
	const [mediaVolume, setMediaVolume] = useState<number>(1);
	const [modalContextType, setModalContextType] = useState<ModalState | null>(
		null
	);

	const checkerboardCtx = useMemo(() => {
		return {
			checkerboard,
			setCheckerboard,
		};
	}, [checkerboard, setCheckerboard]);
	const editorZoomGesturesCtx = useMemo(() => {
		return {
			editorZoomGestures,
			setEditorZoomGestures,
		};
	}, [editorZoomGestures, setEditorZoomGestures]);

	const mediaVolumeContextValue = useMemo((): MediaVolumeContextValue => {
		return {
			mediaMuted,
			mediaVolume,
		};
	}, [mediaMuted, mediaVolume]);

	const setMediaVolumeContextValue = useMemo((): SetMediaVolumeContextValue => {
		return {
			setMediaMuted,
			setMediaVolume,
		};
	}, []);

	const modalsContext = useMemo((): ModalContextType => {
		return {
			selectedModal: modalContextType,
			setSelectedModal: setModalContextType,
		};
	}, [modalContextType]);

	return (
		<PreviewServerConnection>
			<RenderQueueContextProvider>
				<KeybindingContextProvider>
					<CheckerboardContext.Provider value={checkerboardCtx}>
						<EditorZoomGesturesContext.Provider value={editorZoomGesturesCtx}>
							<PreviewSizeProvider>
								<ModalsContext.Provider value={modalsContext}>
									<Internals.MediaVolumeContext.Provider
										value={mediaVolumeContextValue}
									>
										<Internals.SetMediaVolumeContext.Provider
											value={setMediaVolumeContextValue}
										>
											<PlayerInternals.PlayerEventEmitterContext.Provider
												value={emitter}
											>
												<SidebarContextProvider>
													<FolderContextProvider>
														<HighestZIndexProvider>
															<SetTimelineInOutProvider>
																{children}
															</SetTimelineInOutProvider>
														</HighestZIndexProvider>
													</FolderContextProvider>
												</SidebarContextProvider>
											</PlayerInternals.PlayerEventEmitterContext.Provider>
										</Internals.SetMediaVolumeContext.Provider>
									</Internals.MediaVolumeContext.Provider>
								</ModalsContext.Provider>
							</PreviewSizeProvider>
						</EditorZoomGesturesContext.Provider>
					</CheckerboardContext.Provider>
				</KeybindingContextProvider>
			</RenderQueueContextProvider>
		</PreviewServerConnection>
	);
};
