import React, {useCallback, useState} from 'react';
import type {z} from 'remotion';
import {Spacing} from '../../layout';
import {RemotionInput} from '../../NewComposition/RemInput';
import {ValidationMessage} from '../../NewComposition/ValidationMessage';
import {label, optionRow} from '../layout';
import type {JSONPath} from './zod-types';

type LocalState = {
	value: string;
	zodValidation: z.SafeParseReturnType<unknown, unknown>;
};

const fullWidth: React.CSSProperties = {
	width: '100%',
};

export const ZodStringEditor: React.FC<{
	schema: z.ZodTypeAny;
	jsonPath: JSONPath;
	value: string;
	setValue: React.Dispatch<React.SetStateAction<string>>;
}> = ({jsonPath, value, setValue, schema}) => {
	const [localValue, setLocalValue] = useState<LocalState>(() => {
		return {
			value,
			zodValidation: schema.safeParse(value),
		};
	});

	const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
		(e) => {
			const safeParse = schema.safeParse(e.target.value);
			const newLocalState: LocalState = {
				value: e.target.value,
				zodValidation: safeParse,
			};
			setLocalValue(newLocalState);
			if (safeParse.success) {
				setValue(e.target.value);
			}
		},
		[schema, setValue]
	);

	return (
		<div style={optionRow}>
			<div style={label}>{jsonPath[jsonPath.length - 1]}</div>
			<div style={fullWidth}>
				<RemotionInput
					value={localValue.value}
					status={localValue.zodValidation.success ? 'ok' : 'error'}
					placeholder={jsonPath.join('.')}
					onChange={onChange}
				/>
				{!localValue.zodValidation.success && (
					<>
						<Spacing y={1} block />
						<ValidationMessage
							align="flex-end"
							message={localValue.zodValidation.error.format()._errors[0]}
							type="error"
						/>
					</>
				)}
			</div>
		</div>
	);
};
