import type React from 'react';
import {BACKGROUND} from '../../helpers/colors';

export const MENU_VERTICAL_PADDING = 4;
export const SUBMENU_LEFT_INSET = -8;

export const MAX_MENU_WIDTH = 400;

const menuContainer: React.CSSProperties = {
	backgroundColor: BACKGROUND,
	position: 'fixed',
	color: 'white',
	userSelect: 'none',
};

export const SHADOW_TOWARDS_BOTTOM = '0 2px 8px rgba(0, 0, 0, 0.5)';
export const SHADOW_TOWARDS_TOP = '0 -2px 8px rgba(0, 0, 0, 0.5)';

export const menuContainerTowardsBottom: React.CSSProperties = {
	...menuContainer,
	boxShadow: SHADOW_TOWARDS_BOTTOM,
};

export const menuContainerTowardsTop: React.CSSProperties = {
	...menuContainer,
	boxShadow: SHADOW_TOWARDS_TOP,
};

export const outerPortal: React.CSSProperties = {
	position: 'fixed',
};
