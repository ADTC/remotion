import React, {
	createContext,
	useCallback,
	useImperativeHandle,
	useMemo,
} from 'react';

// Key: Composition ID, Value: initialized defaultProps
type Props = Record<string, Record<string, unknown>>;

export type EditorPropsContextType = {
	props: Props;
	updateProps: (options: {
		id: string;
		defaultProps: Record<string, unknown>;
		newProps:
			| Record<string, unknown>
			| ((oldProps: Record<string, unknown>) => Record<string, unknown>);
	}) => void;
};

export const EditorPropsContext = createContext<EditorPropsContextType>({
	props: {},
	updateProps: () => {
		throw new Error('Not implemented');
	},
});

export const editorPropsProviderRef = React.createRef<{
	getProps: () => Props;
}>();

export const EditorPropsProvider: React.FC<{
	readonly children: React.ReactNode;
}> = ({children}) => {
	const [props, setProps] = React.useState<Props>({});

	const updateProps = useCallback(
		({
			defaultProps,
			id,
			newProps,
		}: {
			id: string;
			defaultProps: unknown;
			newProps: unknown | ((oldProps: unknown) => unknown);
		}) => {
			setProps((prev) => {
				return {
					...prev,
					[id]:
						typeof newProps === 'function'
							? newProps(prev[id] ?? defaultProps)
							: newProps,
				};
			});
		},
		[],
	);

	useImperativeHandle(
		editorPropsProviderRef,
		() => {
			return {
				getProps: () => props,
			};
		},
		[props],
	);

	const ctx = useMemo((): EditorPropsContextType => {
		return {props, updateProps};
	}, [props, updateProps]);

	return (
		<EditorPropsContext.Provider value={ctx}>
			{children}
		</EditorPropsContext.Provider>
	);
};
