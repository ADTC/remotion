import {TComposition, TFolder} from 'remotion';
import {CompositionSelectorItemType} from '../components/CompositionSelectorItem';

const splitParentIntoNameAndParent = (
	name: string | null
): {name: string | null; parent: string | null} => {
	if (name === null) {
		return {
			name: null,
			parent: null,
		};
	}

	const splitted = name.split('/');
	const lastName = splitted[splitted.length - 1];
	const parentParentArray = splitted.slice(0, splitted.length - 1);
	const parentParent =
		parentParentArray.length === 0 ? null : parentParentArray.join('/');

	return {
		name: lastName,
		parent: parentParent,
	};
};

const doesFolderExist = (
	items: CompositionSelectorItemType[],
	folderName: string,
	parentName: string | null
): CompositionSelectorItemType[] | false => {
	for (const item of items) {
		if (item.type === 'folder') {
			if (item.folderName === folderName && item.parentName === parentName) {
				return item.items;
			}

			const found = doesFolderExist(item.items, folderName, parentName);
			if (found !== false) {
				return found;
			}
		}
	}

	return false;
};

export const findItemListToPush = (
	items: CompositionSelectorItemType[],
	folderName: string | null,
	parentName: string | null
): CompositionSelectorItemType[] => {
	if (folderName === null) {
		return items;
	}

	const folder = doesFolderExist(items, folderName, parentName);
	if (!folder) {
		console.log({items, folderName, parentName});
		throw new Error('did not find folder ' + folderName);
	}

	return folder;
};

const createFolderIfDoesNotExist = (
	items: CompositionSelectorItemType[],
	availableFolders: TFolder[],
	folderItem: TFolder,
	foldersExpanded: Record<string, boolean>
) => {
	if (doesFolderExist(items, folderItem.name, folderItem.parent)) {
		return;
	}

	const splitted = splitParentIntoNameAndParent(folderItem.parent);
	if (folderItem.parent) {
		const parent = availableFolders.find(
			(f) => f.name === splitted.name && f.parent === splitted.parent
		);
		if (!parent) {
			throw new Error('unexpectedly did not have parent');
		}

		createFolderIfDoesNotExist(
			items,
			availableFolders,
			parent,
			foldersExpanded
		);
	}

	const itemList = findItemListToPush(items, splitted.name, splitted.parent);
	if (!itemList) {
		throw new Error('why did folder not exist? ' + folderItem.name);
	}

	itemList.push({
		type: 'folder',
		folderName: folderItem.name,
		items: [],
		key: folderItem.name,
		expanded: foldersExpanded[folderItem.name] ?? false,
		parentName: folderItem.parent,
	});
};

export const createFolderTree = (
	comps: TComposition<unknown>[],
	folders: TFolder[],
	foldersExpanded: Record<string, boolean>
): CompositionSelectorItemType[] => {
	const items: CompositionSelectorItemType[] = [];
	for (const folder of folders) {
		createFolderIfDoesNotExist(items, folders, folder, foldersExpanded);
	}

	for (const item of comps) {
		const toPush: CompositionSelectorItemType = {
			type: 'composition',
			composition: item,
			key: item.id,
		};
		const list = findItemListToPush(
			items,
			item.folderName,
			item.parentFolderName
		);
		list.push(toPush);
	}

	return items;
};
