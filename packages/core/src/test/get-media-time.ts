import {getMediaTime} from '../video/get-current-time';

test('Should correctly calculate the media time of a video element', () => {
	expect(
		getMediaTime({
			fps: 30,
			frame: 30,
			playbackRate: 1,
			src: 'video.mp4',
			startFrom: 0,
		})
	).toBe(1);
});

test('Should correctly calculate the media time of a video element with faster framerate', () => {
	expect(
		getMediaTime({
			fps: 30,
			frame: 30,
			playbackRate: 2,
			src: 'video.mp4',
			startFrom: 0,
		})
	).toBe(2);
});

test('Should correctly calculate the media time of a video element with faster framerate and a startFrom', () => {
	// If playbackrate is 2, but the video only starts after 1 second, at 2sec, the video position should be 3sec
	expect(
		getMediaTime({
			fps: 30,
			frame: 60,
			playbackRate: 2,
			src: 'video.mp4',
			startFrom: 30,
		})
	).toBe(3);
});
