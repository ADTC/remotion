---
id: deployproject
title: deployProject()
slug: /lambda/deployproject
---

Takes a Remotion project, bundles it and uploads it to an S3 bucket. Once uploaded, a Lambda function can render any composition in the Remotion project by specifying the URL.

Note that the Remotion project will be deployed to a subdirectory, not the root of the domain. Therefore you must ensure that if you have specified paths in your Remotion project, they are able to handle this scenario.

Before calling this function, you should create a bucket, see [`getOrCreateBucket()`](/docs/lambda/getorcreatebucket).

## Example

```ts twoslash
// @module: esnext
// @target: es2017
import {deployProject} from '@remotion/lambda';

const {url} = await deployProject({
  entryPoint: '/Users/jonnyburger/my-remotion-video/src/index.tsx',
  bucketName: 'remotionlambda-c7fsl3d',
  region: 'us-east-1',
  options: {
    onBundleProgress: (progress) => {
      // Progress is between 0 and 100
      console.log(`Bundle progress: ${progress}%`)
    },
    onUploadProgress: ({totalFiles, filesUploaded, totalSize, sizeUploaded}) => {
      console.log(`Upload progress: Total files ${totalFiles}, Files uploaded ${filesUploaded}, Total size ${totalSize}, Size uploaded ${sizeUploaded}`, )
    }
  }
})
console.log(url);
```

## Arguments

An object with the following properties:

### `entryPoint`

An absolute path pointing to the entry file of your Remotion project. Usually the entry file in your Remotion project is stored at `src/entry.tsx`.

### `bucketName`

The bucket to where the website will be deployed. The bucket must have been created by Remotion Lambda.

### `region`

The AWS region in which the bucket resides.

### `options`

_optional_

An object with the following properties:

#### `onBundleProgress`

_optional_

Callback from Webpack when the bundling has progressed. Passes a number between 0 and 100 to the callback, see example at the top of the page.

#### `onUploadProgress`

_optional_

Callback function that gets called when uploading of the assets has progressed. Passes an object with the following properties to the callback:

- `totalFiles` (_number_): Total number of files in the bundle.
- `filesUploaded` (_number_): Number of files that have been fully uploaded so far.
- `totalSize` (_number_): Total size in bytes of all the files in the bundle.
- `sizeUploaded` (_number_): Amount of bytes uploaded so far.

## Return value

An object with the following values:

- `url` _(string)_: The URL of the website that has been deployed. You can pass in this URL when rendering videos with Remotion Lambda.
