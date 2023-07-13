import {useCallback, useContext} from 'react';
import {ControlButton} from './ControlButton';
import {canvasRef} from '../state/canvas-ref';
import {PreviewSizeContext} from '../state/preview-size';

export const FullScreenToggle: React.FC<{}> = () => {
	const {setSize} = useContext(PreviewSizeContext);

	const onClick = useCallback(() => {
		canvasRef.current?.requestFullscreen();

		setSize(() => ({
			size: 'auto',
			translation: {
				x: 0,
				y: 0,
			},
		}));
	}, [setSize]);

	return (
		<ControlButton
			title="Enter fullscreen"
			aria-label="Enter fullscreen"
			onClick={onClick}
		>
			<svg style={{width: 18, height: 18}} viewBox="0 0 448 512" fill="#fff">
				<path d="M0 180V56c0-13.3 10.7-24 24-24h124c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H64v84c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12zM288 44v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12V56c0-13.3-10.7-24-24-24H300c-6.6 0-12 5.4-12 12zm148 276h-40c-6.6 0-12 5.4-12 12v84h-84c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24V332c0-6.6-5.4-12-12-12zM160 468v-40c0-6.6-5.4-12-12-12H64v-84c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v124c0 13.3 10.7 24 24 24h124c6.6 0 12-5.4 12-12z" />
			</svg>
		</ControlButton>
	);
};
