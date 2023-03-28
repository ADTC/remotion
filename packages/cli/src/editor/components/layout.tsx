import React, {useMemo} from 'react';

export const SPACING_UNIT = 8;

export const Spacing: React.FC<{
	x?: number;
	y?: number;
	block?: boolean;
}> = ({x = 0, y = 0, block = false}) => {
	const style = useMemo((): React.CSSProperties => {
		return {
			display: block ? 'block' : 'inline-block',
			width: x * SPACING_UNIT,
			height: y * SPACING_UNIT,
			flexShrink: 0,
		};
	}, [block, x, y]);

	return <div style={style} />;
};

const flex: React.CSSProperties = {flex: 1};

export const Flex: React.FC<{
	children?: React.ReactNode;
}> = ({children}) => <div style={flex}>{children}</div>;

export const Row: React.FC<{
	justify?: 'center' | 'flex-start' | 'flex-end';
	align?: 'center';
	style?: React.CSSProperties;
	className?: string;
	children: React.ReactNode;
}> = ({children, justify, className, align, style = {}}) => {
	const finalStyle: React.CSSProperties = useMemo(() => {
		return {
			...style,
			display: 'flex',
			flexDirection: 'row',
			justifyContent: justify ?? 'flex-start',
			alignItems: align ?? 'flex-start',
		};
	}, [align, justify, style]);
	return (
		<div className={className} style={finalStyle}>
			{children}
		</div>
	);
};

export const Column: React.FC<{
	justify?: 'center';
	align?: 'center';
	style?: React.CSSProperties;
	className?: string;
	children: React.ReactNode;
}> = ({children, justify, className, align, style = {}}) => {
	const finalStyle: React.CSSProperties = useMemo(() => {
		return {
			...style,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: justify ?? 'flex-start',
			alignItems: align ?? 'flex-start',
		};
	}, [align, justify, style]);
	return (
		<div className={className} style={finalStyle}>
			{children}
		</div>
	);
};
