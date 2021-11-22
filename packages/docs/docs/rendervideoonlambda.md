---
id: rendervideoonlambda
title: renderVideoOnLambda()
slug: /lambda/rendervideoonlambda
---

import { DefaultFramesPerLambda, MinimumFramesPerLambda } from "../components/lambda/default-frames-per-lambda";

Triggers a render on a lambda given a composition and a lambda function.

## Example

```tsx twoslash
// @module: esnext
// @target: es2017
import { renderVideoOnLambda } from "@remotion/lambda";
// ---cut---

const { bucketName, renderId } = await renderVideoOnLambda({
  region: "us-east-1",
  functionName: "remotion-render-bds9aab",
  composition: "MyVideo",
  framesPerLambda: 20,
  serveUrl:
    "https://remotionlambda-qg35eyp1s1.s3.eu-central-1.amazonaws.com/sites/bf2jrbfkw",
  inputProps: {},
  codec: "h264-mkv",
  imageFormat: "jpeg",
  maxRetries: 1,
  privacy: "public",
  enableChunkOptimization: true,
});
```

## Arguments

An object with the following properties:

### `region`

In which region your Lambda function is deployed. It's highly recommended that your Remotion site is also in the same region.

### `privacy`

Either `"public"` or `"private"`, determining whether the video can be seen by anyone after it's uploaded to the S3 bucket.

### `functionName`

The name of the deployed Lambda function.
Use [`deployFunction()`](/docs/lambda/deployfunction) to create a new function and [`getFunctions()`](/docs/lambda/getfunctions) to obtain currently deployed Lambdas.

### `framesPerLambda`

The video rendering process gets distributed across multiple Lambda functions. This setting controls how many frames are rendered per Lambda invocation. The lower the number you pass, the more Lambdas get spawned.

Default value: <DefaultFramesPerLambda /> <br/>
Minimum value: <MinimumFramesPerLambda />

### `serveUrl`

A URL pointing to a Remotion project. Use [`deploySite()`](/docs/lambda/deploysite) to deploy a Remotion project.

### `composition`

The name of the [composition](/docs/composition) you want to render.

### `inputProps`

React props that are passed to your composition. You define the shape of the props that the component accepts.

### `codec`

Which codec should be used to encode the video. At the moment the only supported video codec is `h264-mkv`, which will return a MP4 encoded using H.264, but where the chunks are encoded in the Matruska container. The reason Lambda has a special value is to allow audio to be stitched together seamlessly.

Audio codecs `mp3`, `aac` and `wav` are also supported.

See also [`renderMedia() -> codec`](/docs/renderer/render-media#codec).

### `imageFormat`

See [`renderMedia() -> imageFormat`](/docs/renderer/render-media#imageformat).

### `crf`

See [`renderMedia() -> crf`](/docs/renderer/render-media#crf).

### `envVariables`

See [`renderMedia() -> envVariables`](/docs/renderer/render-media#envvariables).

### `pixelFormat`

See [`renderMedia() -> pixelFormat`](/docs/renderer/render-media#pixelformat).

### `proResProfile`

See [`renderMedia() -> proResProfile`](/docs/renderer/render-media#proresprofile).

### `quality`

See [`renderMedia() -> quality`](/docs/renderer/render-media#quality).

### `maxRetries`

_optional, default `1`_

How often a chunk may be retried to render in case the render fails.
If a rendering of a chunk is failed, the error will be reported in the [`getRenderProgress()`](/docs/lambda/getrenderprogress) object and retried up to as many times as you specify using this option.

### `enableChunkOptimization`

_Default `true`_

If this is enabled, Remotion will use [chunk optimization](/docs/lambda/chunk-optimization) to learn from a rendering and restructure chunks for subsequent renders of the same composition to optimize for overall render time.

## Return value

Returns a promise resolving to an object containing two properties: `renderId` and `bucketName`. Those are useful for passing to `getRenderProgress()`

### `renderId`

A unique alphanumeric identifier for this render. Useful for obtaining status and finding the relevant files in the S3 bucket.

### `bucketName`

The S3 bucket name in which all files are being saved.

## See also

- [getRenderProgress()](/docs/lambda/getrenderprogress)
