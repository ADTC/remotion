---
image: /generated/articles-docs-renderer-get-silent-parts.png
id: get-silent-parts
title: getSilentParts()
crumb: "@remotion/renderer"
---

# getSilentParts()<AvailableFrom v="4.0.18" />

:::note
This function is meant to be used **in Node.js applications**. It cannot run in the browser.
:::

Gets the silent parts of a video or audio in Node.js. Useful for cutting out silence from a video.

## Example

```ts twoslash title="silent-parts.mjs"
// @module: ESNext
// @target: ESNext
import { getSilentParts } from "@remotion/renderer";

const { silentParts, durationInSeconds } = await getSilentParts({
  src: "./bunny.mp4",
  noiseThresholdInDecibels: -20,
  minDuration: 1,
});

console.log(silentParts); // [{startInSeconds: 0, endInSeconds: 1.5}]
```

## Arguments

An object which takes the following properties:

### `source`

_string_

A local video or audio file path.

### `noiseThresholdInDecibels`

_number, optional_

The threshold in decibels. If the audio is below this threshold, it is considered silent. The default is `-20`. Must be less than `30`.

### `minDuration`

_number, optional_

The minimum duration of a silent part in seconds. The default is `1`.

### `logLevel`

_`"info" | "warn" | "error" | "verbose"`, optional_

The log level. The default is `"info"`.

## Return Value

The return value is an object with the following properties:

### `silentParts`

An array of objects with the following properties:

- `startInSeconds`: The start time of the silent part in seconds.
- `endInSeconds`: The end time of the silent part in seconds.

### `durationInSeconds`

The time length of the media in seconds.

## See also

- [Source code for this function](https://github.com/remotion-dev/remotion/blob/main/packages/renderer/src/get-silent-parts.ts)
- [getVideoMetadata()](/docs/renderer/get-video-metadata)
