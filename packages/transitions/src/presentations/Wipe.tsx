import React, {useMemo, useState} from 'react';
import {AbsoluteFill, random} from 'remotion';
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '../types.js';

const makePathIn = (progress: number, direction: WipeDirection) => {
	switch (direction) {
		case 'from-left':
			return `
M 0 0
L ${progress} 0
L ${progress} 1
L 0 1
Z`;

		case 'from-top-left':
			return `
M 0 0
L ${progress * 2} 0
L 0 ${progress * 2}
Z`;

		case 'from-top':
			return `
M 0 0
L 1 0
L 1 ${progress}
L 0 ${progress}
Z`;

		case 'from-top-right':
			return `
M 1 0
L ${1 - progress * 2} 0
L 1 ${progress * 2}
Z`;

		case 'from-right':
			return `
M 1 0
L 1 1
L ${1 - progress} 1
L ${1 - progress} 0
Z`;

		case 'from-bottom-right':
			return `
M 1 1
L ${1 - progress * 2} 1
L 1 ${1 - progress * 2}
Z`;

		case 'from-bottom':
			return `
M 0 1
L 1 1
L 1 ${1 - progress}
L 0 ${1 - progress}
Z`;

		case 'from-bottom-left':
			return `
M 0 1
L 0 ${1 - progress * 2}
L ${progress * 2} 1
Z`;

		default:
			throw new Error(`Unknown direction ${JSON.stringify(direction)}`);
	}
};

type WipeDirection =
	| 'from-left'
	| 'from-top-left'
	| 'from-top'
	| 'from-top-right'
	| 'from-right'
	| 'from-bottom-right'
	| 'from-bottom'
	| 'from-bottom-left';

type WipeProps = {
	direction: WipeDirection;
};

const makePathOut = (progress: number, direction: WipeDirection) => {
	switch (direction) {
		case 'from-left':
			return `
M 1 1
L ${1 - progress} 1
L ${1 - progress} 0
L 1 0
Z`;

		case 'from-top-left':
			return `
M 1 1
L ${1 - 2 * progress} 1
L 1 ${1 - 2 * progress}
Z`;

		case 'from-top':
			return `
M 1 1
L 0 1
L 0 ${1 - progress}
L 1 ${1 - progress}
Z`;

		case 'from-top-right':
			return `
M 0 1
L ${progress * 2} 1
L 0 ${1 - progress * 2}
Z`;

		case 'from-right':
			return `
M 0 0
L ${progress} 0
L ${progress} 1
L 0 1
Z`;

		case 'from-bottom-right':
			return `
M 0 0
L ${progress * 2} 0
L 0 ${progress * 2}
Z`;

		case 'from-bottom':
			return `
M 1 0
L 0 0
L 0 ${progress}
L 1 ${progress}
Z`;

		case 'from-bottom-left':
			return `
M 1 0
L ${1 - progress * 2} 0
L 1 ${progress * 2}
Z`;

		default:
			throw new Error(`Unknown direction ${JSON.stringify(direction)}`);
	}
};

const WipePresentation: React.FC<
	TransitionPresentationComponentProps<WipeProps>
> = ({
	children,
	presentationProgress,
	presentationDirection,
	passedProps: {direction: wipeDirection},
}) => {
	const [clipId] = useState(() => String(random(null)));

	const progressInDirection =
		presentationDirection === 'in'
			? presentationProgress
			: 1 - presentationProgress;

	const path =
		presentationDirection === 'in'
			? makePathIn(progressInDirection, wipeDirection)
			: makePathOut(progressInDirection, wipeDirection);

	const style: React.CSSProperties = useMemo(() => {
		return {
			width: '100%',
			height: '100%',
			justifyContent: 'center',
			alignItems: 'center',
			clipPath: `url(#${clipId})`,
		};
	}, [clipId]);

	const svgStyle: React.CSSProperties = useMemo(() => {
		return {
			width: '100%',
			height: '100%',
		};
	}, []);

	return (
		<AbsoluteFill>
			<AbsoluteFill style={style}>{children}</AbsoluteFill>
			<AbsoluteFill>
				<svg viewBox="0 0 1 1" style={svgStyle}>
					<defs>
						<clipPath id={clipId} clipPathUnits="objectBoundingBox">
							<path d={path} fill="black" />
						</clipPath>
					</defs>
				</svg>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

export const makeWipePresentation = (
	props: WipeProps
): TransitionPresentation<WipeProps> => {
	return {
		component: WipePresentation,
		props,
	};
};
