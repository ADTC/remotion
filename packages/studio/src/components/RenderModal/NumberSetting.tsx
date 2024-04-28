import type {AvailableOptions} from '@remotion/renderer/client';
import React, {useCallback} from 'react';
import {InputDragger} from '../NewComposition/InputDragger';
import {RightAlignInput} from '../NewComposition/RemInput';
import {Spacing} from '../layout';
import {OptionExplainerBubble} from './OptionExplainerBubble';
import {label, optionRow, rightRow} from './layout';

export const NumberSetting: React.FC<{
	name: string;
	value: number;
	onValueChanged: React.Dispatch<React.SetStateAction<number>>;
	max?: number;
	min: number;
	step: number;
	formatter?: (value: string | number) => string;
	hint?: AvailableOptions;
}> = ({name, value, step, hint, onValueChanged, max, min, formatter}) => {
	const onTextChanged = useCallback(
		(e: string) => {
			onValueChanged((q) => {
				const newSetting = step < 1 ? parseFloat(e) : parseInt(e, 10);
				if (Number.isNaN(newSetting)) {
					return q;
				}

				return Math.min(max ?? Infinity, Math.max(newSetting, min));
			});
		},
		[max, min, onValueChanged, step],
	);

	const onValueChange = useCallback(
		(newConcurrency: number) => {
			onValueChanged(newConcurrency);
		},
		[onValueChanged],
	);

	return (
		<div style={optionRow}>
			<div style={label}>
				{name}
				{hint ? (
					<>
						<Spacing x={0.5} />
						<OptionExplainerBubble id={hint} />
					</>
				) : null}
			</div>
			<div style={rightRow}>
				<RightAlignInput>
					<InputDragger
						value={value}
						name={name.toLowerCase()}
						onTextChange={onTextChanged}
						onValueChange={onValueChange}
						step={step}
						placeholder={[min, max]
							.map((f) => (f !== null && f !== undefined ? f : ''))
							.join('-')}
						min={min}
						max={max}
						formatter={formatter}
						status="ok"
						rightAlign
					/>
				</RightAlignInput>
			</div>
		</div>
	);
};
