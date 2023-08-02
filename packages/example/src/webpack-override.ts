import {WebpackOverrideFn} from '@remotion/bundler';
import path from 'node:path';
import {enableTailwind} from '@remotion/tailwind';
type Bundler = 'webpack' | 'esbuild';

const WEBPACK_OR_ESBUILD = 'esbuild' as Bundler;

export const webpackOverride: WebpackOverrideFn = (currentConfiguration) => {
	const replaced = (() => {
		if (WEBPACK_OR_ESBUILD === 'webpack') {
			const {replaceLoadersWithBabel} = require(path.join(
				__dirname,
				'..',
				'..',
				'example',
				'node_modules',
				'@remotion/babel-loader'
			));
			return replaceLoadersWithBabel(currentConfiguration);
		}

		return currentConfiguration;
	})();
	return enableTailwind({
		...replaced,
		module: {
			...replaced.module,
			rules: [
				...(replaced.module?.rules ?? []),
				{
					test: /\.mdx?$/,
					use: [
						{
							loader: '@mdx-js/loader',
							options: {},
						},
					],
				},
			],
		},
		resolve: {
			...replaced.resolve,
			alias: {
				...replaced.resolve.alias,
				lib: path.join(process.cwd(), 'src', 'lib'),
			},
		},
	});
};
