import type {MouseEventHandler} from 'react';
import React, {useContext, useMemo} from 'react';
import {Internals} from 'remotion';
import {FAIL_COLOR, LIGHT_TEXT} from '../helpers/colors';
import {Flex} from './layout';
import {RenderQueueContext} from './RenderQueue/context';
import {Tab} from './Tabs';

const row: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'row',
	fontSize: 14,
	color: 'inherit',
	alignItems: 'center',
	flex: 1,
};

const badge: React.CSSProperties = {
	height: 16,
	width: 16,
	borderRadius: 3,
	fontSize: 10,
	display: 'inline-flex',
	justifyContent: 'center',
	alignItems: 'center',
};

export const RendersTab: React.FC<{
	selected: boolean;
	onClick: MouseEventHandler<HTMLButtonElement>;
}> = ({selected, onClick}) => {
	const {jobs} = useContext(RenderQueueContext);
	const {currentComposition} = useContext(Internals.CompositionManager);
	const failedJobs = jobs.filter((j) => j.status === 'failed').length;
	const jobCount = jobs.length;

	const derivedSelection = useMemo(() => {
		if (!currentComposition) {
			return true;
		}

		return selected;
	}, [currentComposition, selected]);
	const badgeStyle: React.CSSProperties = useMemo(() => {
		return {
			...badge,
			backgroundColor: failedJobs > 0 ? FAIL_COLOR : 'transparent',
			color: failedJobs > 0 ? 'white' : LIGHT_TEXT,
			borderWidth: failedJobs > 0 ? 0 : 1,
			borderStyle: 'solid',
			borderColor: LIGHT_TEXT,
		};
	}, [failedJobs]);

	return (
		<Tab selected={derivedSelection} onClick={onClick}>
			<div style={row}>
				Renders
				{jobCount > 0 ? (
					<>
						<Flex />
						<div style={badgeStyle}>{jobCount}</div>
					</>
				) : null}
			</div>
		</Tab>
	);
};
