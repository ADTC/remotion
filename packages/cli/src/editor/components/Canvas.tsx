import {getVideoMetadata} from '@remotion/media-utils';
import {PlayerInternals} from '@remotion/player';
import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type {CanvasContent} from 'remotion';
import {Internals, staticFile} from 'remotion';
import {
	MAX_ZOOM,
	MIN_ZOOM,
	smoothenZoom,
	unsmoothenZoom,
} from '../../smooth-zoom';
import {BACKGROUND} from '../helpers/colors';
import {
	getCenterPointWhileScrolling,
	getEffectiveTranslation,
} from '../helpers/get-effective-translation';
import type {Dimensions} from '../helpers/is-current-selected-still';
import {useKeybinding} from '../helpers/use-keybinding';
import {canvasRef as ref} from '../state/canvas-ref';
import {EditorZoomGesturesContext} from '../state/editor-zoom-gestures';
import {PreviewSizeContext} from '../state/preview-size';
import {SPACING_UNIT} from './layout';
import {getPreviewFileType, VideoPreview} from './Preview';
import {ResetZoomButton} from './ResetZoomButton';

const container: React.CSSProperties = {
	flex: 1,
	display: 'flex',
	overflow: 'hidden',
	position: 'relative',
	backgroundColor: BACKGROUND,
};

const resetZoom: React.CSSProperties = {
	position: 'absolute',
	top: SPACING_UNIT * 2,
	right: SPACING_UNIT * 2,
};

const ZOOM_PX_FACTOR = 0.003;

export const Canvas: React.FC<{
	canvasContent: CanvasContent;
}> = ({canvasContent}) => {
	const {setSize, size: previewSize} = useContext(PreviewSizeContext);
	const {editorZoomGestures} = useContext(EditorZoomGesturesContext);
	const keybindings = useKeybinding();
	const config = Internals.useUnsafeVideoConfig();

	const [assetResolution, setAssetResolution] = useState<
		Dimensions | 'none' | null
	>(null);

	const contentDimensions = useMemo(() => {
		if (canvasContent.type === 'asset' || canvasContent.type === 'output') {
			return assetResolution;
		}

		if (config) {
			return {width: config.width, height: config.height};
		}

		return null;
	}, [assetResolution, config, canvasContent]);

	const size = PlayerInternals.useElementSize(ref, {
		triggerOnWindowResize: false,
		shouldApplyCssTransforms: true,
	});

	const isFit = previewSize.size === 'auto';

	const onWheel = useCallback(
		(e: WheelEvent) => {
			if (!editorZoomGestures) {
				return;
			}

			if (!size) {
				return;
			}

			if (!contentDimensions || contentDimensions === 'none') {
				return;
			}

			const wantsToZoom = e.ctrlKey || e.metaKey;

			if (!wantsToZoom && isFit) {
				return;
			}

			e.preventDefault();

			setSize((prevSize) => {
				const scale = PlayerInternals.calculateScale({
					canvasSize: size,
					compositionHeight: contentDimensions.height,
					compositionWidth: contentDimensions.width,
					previewSize: prevSize.size,
				});

				// Zoom in/out
				if (wantsToZoom) {
					const oldSize = prevSize.size === 'auto' ? scale : prevSize.size;
					const smoothened = smoothenZoom(oldSize);
					const added = smoothened + e.deltaY * ZOOM_PX_FACTOR;
					const unsmoothened = unsmoothenZoom(added);

					const {centerX, centerY} = getCenterPointWhileScrolling({
						size,
						clientX: e.clientX,
						clientY: e.clientY,
						compositionWidth: contentDimensions.width,
						compositionHeight: contentDimensions.height,
						scale,
						translation: prevSize.translation,
					});

					const zoomDifference = unsmoothened - oldSize;

					const uvCoordinatesX = centerX / contentDimensions.width;
					const uvCoordinatesY = centerY / contentDimensions.height;

					const correctionLeft =
						-uvCoordinatesX * (zoomDifference * contentDimensions.width) +
						(1 - uvCoordinatesX) * zoomDifference * contentDimensions.width;
					const correctionTop =
						-uvCoordinatesY * (zoomDifference * contentDimensions.height) +
						(1 - uvCoordinatesY) * zoomDifference * contentDimensions.height;

					return {
						translation: getEffectiveTranslation({
							translation: {
								x: prevSize.translation.x - correctionLeft / 2,
								y: prevSize.translation.y - correctionTop / 2,
							},
							canvasSize: size,
							compositionHeight: contentDimensions.height,
							compositionWidth: contentDimensions.width,
							scale,
						}),
						size: unsmoothened,
					};
				}

				const effectiveTranslation = getEffectiveTranslation({
					translation: prevSize.translation,
					canvasSize: size,
					compositionHeight: contentDimensions.height,
					compositionWidth: contentDimensions.width,
					scale,
				});

				// Pan
				return {
					...prevSize,
					translation: getEffectiveTranslation({
						translation: {
							x: effectiveTranslation.x + e.deltaX,
							y: effectiveTranslation.y + e.deltaY,
						},
						canvasSize: size,
						compositionHeight: contentDimensions.height,
						compositionWidth: contentDimensions.width,
						scale,
					}),
				};
			});
		},
		[editorZoomGestures, contentDimensions, isFit, setSize, size],
	);

	useEffect(() => {
		const {current} = ref;
		if (!current) {
			return;
		}

		current.addEventListener('wheel', onWheel, {passive: false});

		return () =>
			// @ts-expect-error
			current.removeEventListener('wheel', onWheel, {
				passive: false,
			});
	}, [onWheel]);

	const onReset = useCallback(() => {
		setSize(() => {
			return {
				translation: {
					x: 0,
					y: 0,
				},
				size: 'auto',
			};
		});
	}, [setSize]);

	const onZoomIn = useCallback(() => {
		if (!contentDimensions || contentDimensions === 'none') {
			return;
		}

		if (!size) {
			return;
		}

		setSize((prevSize) => {
			const scale = PlayerInternals.calculateScale({
				canvasSize: size,
				compositionHeight: contentDimensions.height,
				compositionWidth: contentDimensions.width,
				previewSize: prevSize.size,
			});
			return {
				translation: {
					x: 0,
					y: 0,
				},
				size: Math.min(MAX_ZOOM, scale * 2),
			};
		});
	}, [contentDimensions, setSize, size]);

	const onZoomOut = useCallback(() => {
		if (!contentDimensions || contentDimensions === 'none') {
			return;
		}

		if (!size) {
			return;
		}

		setSize((prevSize) => {
			const scale = PlayerInternals.calculateScale({
				canvasSize: size,
				compositionHeight: contentDimensions.height,
				compositionWidth: contentDimensions.width,
				previewSize: prevSize.size,
			});
			return {
				translation: {
					x: 0,
					y: 0,
				},
				size: Math.max(MIN_ZOOM, scale / 2),
			};
		});
	}, [contentDimensions, setSize, size]);

	useEffect(() => {
		const resetBinding = keybindings.registerKeybinding({
			event: 'keydown',
			key: '0',
			commandCtrlKey: false,
			callback: onReset,
			preventDefault: true,
			triggerIfInputFieldFocused: false,
		});

		const zoomIn = keybindings.registerKeybinding({
			event: 'keydown',
			key: '+',
			commandCtrlKey: false,
			callback: onZoomIn,
			preventDefault: true,
			triggerIfInputFieldFocused: false,
		});

		const zoomOut = keybindings.registerKeybinding({
			event: 'keydown',
			key: '-',
			commandCtrlKey: false,
			callback: onZoomOut,
			preventDefault: true,
			triggerIfInputFieldFocused: false,
		});

		return () => {
			resetBinding.unregister();
			zoomIn.unregister();
			zoomOut.unregister();
		};
	}, [keybindings, onReset, onZoomIn, onZoomOut]);

	const fetchMetadata = useCallback(async () => {
		if (canvasContent.type !== 'asset' && canvasContent.type !== 'output') {
			return;
		}

		const src =
			canvasContent.type === 'asset'
				? staticFile(canvasContent.asset)
				: window.remotion_staticBase.replace('static', 'outputs') +
				  canvasContent.path;

		setAssetResolution(null);

		const fileType = getPreviewFileType(src);

		if (fileType === 'video') {
			try {
				await getVideoMetadata(src).then((data) => {
					setAssetResolution({width: data.width, height: data.height});
				});
			} catch {
				setAssetResolution('none');
			}
		} else if (fileType === 'image') {
			const img = new Image();
			img.onload = () => {
				setAssetResolution({width: img.width, height: img.height});
			};

			img.src = src;
		} else {
			setAssetResolution('none');
		}
	}, [canvasContent]);

	useEffect(() => {
		fetchMetadata();
	}, [fetchMetadata]);

	return (
		<div ref={ref} style={container}>
			{size ? (
				<VideoPreview
					canvasContent={canvasContent}
					contentDimensions={contentDimensions}
					canvasSize={size}
				/>
			) : null}
			{isFit ? null : (
				<div style={resetZoom} className="css-reset">
					<ResetZoomButton onClick={onReset} />
				</div>
			)}
		</div>
	);
};
