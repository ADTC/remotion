type RenderJobDynamicStatus =
	| {
			status: 'done';
	  }
	| {
			status: 'running';
	  }
	| {
			status: 'idle';
	  }
	| {
			status: 'failed';
			error: {
				message: string;
				stack: string | undefined;
			};
	  };

export type RenderJob = {
	startedAt: number;
	compositionId: string;
	type: 'still' | 'composition';
	id: string;
	outputLocation: string;
} & RenderJobDynamicStatus;

export type AddRenderRequest = {
	compositionId: string;
	type: 'still' | 'composition';
	outName: string;
};

export type RemoveRenderRequest = {
	jobId: string;
};

export type OpenInFileExplorerRequest = {
	// TODO: Don't allow paths outside Remotion directory
	directory: string;
};
