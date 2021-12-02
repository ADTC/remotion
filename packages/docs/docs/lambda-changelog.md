---
id: lambda-changelog
title: Changelog
slug: /lambda/changelog
---

Keep track of changes to the APIs of Remotion Lambda here.

## How to upgrade

1. Get the newest version from the `#lambda` Discord channel.
1. Upgrade all packages to the newest version (`@remotion/lambda`, but also `remotion`, `@remotion/cli` etc.)
1. (Optional) Remove all existing lambdas: `npx remotion-lambda functions ls` and then `npx remotion-lambda functions rm <function-name>`
1. Redeploy your function: `npx remotion lambda functions deploy`
1. Migrate according to the changelog below:

## Unreleased

- Deleted `save-browser-logs` function in favour of the new CloudWatch solution. Pass `--log=verbose` instead and see CloudWatch for more detailed logs.
- Retry if the AWS rate limit is exceeded for `npx remotion lambda permissions validate` command and for `validatePermissions()` function.
- Improve Setup guide

## November 28th, 2021

Version hash: `3.0.0-lambda.158+f214b5355`
Lambda version: '2021-11-29'

- Fixes a bug with `renderVideoOnLambda()`

## November 27th, 2021

Version hash: `3.0.0-lambda.151+ba8c212b9`
Lambda version: '2021-11-27'

Remotion 3.0 Rendering pipeline refactor merged into this branch!

- **Parallel encoding**: Now rendering and encoding happens at the same time! You should see a speed improvement. Also, if you embedded videos with audio, these are now downloaded earlier in the rendering process, which will give the rendering times another boost.
- **Breaking**: Server-side rendering APIs have been refactored. See the separate [3.0 Migration](/docs/3-0-migration) page for it. New `openBrowser()` and `renderMedia()` APIs are now available.
- Downloading a video using the CLI now shows a progress bar.

## November 24th, 2021

Version hash: `3.0.0-lambda.143+08ebdfa17`
Lambda version: '2021-11-24'

- **Breaking**: Migrated to **ARM architecture**! This means 34% better cost/performance ratio. However, only the following 10 regions support ARM architectures: `eu-central-1`, `eu-west-1`, `eu-west-2`, `us-east-1`, `us-east-2`, `us-west-2`, `ap-south-1`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`.

That means that the previously supported regions `us-west-1`, `af-south-1`, `ap-east-1`, `ap-northeast-2`, `ap-northeast-3`, `ca-central-1`, `eu-west-1`, `eu-west-2`, `eu-south-1`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1` are not supported anymore.

We will add those regions back again once AWS adds support for Lambda.

- Fixes an issue where multiple versions of Remotion could appear in a project even though they were pinned down in your `package.json`.
- Fixes an issue where audio could become out of sync if audio with different sample rates was appearing in the video

## November 18th, 2021

Version hash: `3.0.0-lambda.122+a588a81b9`
Lambda version: '2021-11-18'

- The default number of max retries is now 1 (previously 3). A new CLI flag `--max-retries` was introduced which can be used for `npx remotion lambda render` and `npx remotion lambda still`
- You can now pass `--privacy=public` or `--privacy=private` in the CLi to determine if the output video should be publicly accessible. The default is and was `public`.
- Fixes an issue where a Remotion version mismatch could happen.

## November 12th, 2021

Version hash: `3.0.0-lambda.99+bd5d55651`
Lambda version: '2021-11-12'

- **Breaking change**: Update your AWS user and role policies

1. Update to the newest version of Remotion Lambda.
1. Read [Step 2](/docs/lambda/setup#2-create-role-policy) of the setup guide and update the role with the newest policy (`npx remotion lambda policies role`).
1. Read [Step 5](/docs/lambda/setup#5-add-permissions-to-your-user) of the setup guide and update the user with the newest policy (`npx remotion lambda policies user`).

- **Breaking change**: If your application throws an error or exception, the render will now fail. This will be the default behavior of Remotion 3.0. See: [3.0 Migration](/docs/3-0-migration)
- Added CloudWatch support, now you can read the logs inside the Lambda function. When you execute `npx remotion lambda render`, add the `--log=verbose` flag to print out an URL to CloudWatch.
- Switched to new rendering mechanism which renders + encodes the video in parallel, saving a significant amount of render time!
- Improved CLI output of `npx remotion lambda render`
- Added changes from 2.5.1 - 2.5.4
- Disabled automatic AWS Lambda retrying in favor of our own retry mechanism

## November 1st, 2021

Version hash: `3.0.0-lambda.57+d1dd7ce77`
Lambda version: '2021-11-01'

- `deploySite()` now returns `serveUrl` instead of `url`
- `renderStillOnLambda()` returns a new field: `renderId`
- Documented `downloadVideo()` method
- `downloadVideo()` return value property renamed from `size` to `sizeInBytes`
- Command `npx remotion lambda sites ls` now supports `-q` flag
- `getSites()` command now returns a `serveUrl` for each site
- Deleted the `cleanup` command - it's obsolete
- Added [Production checklist page](/docs/lambda/checklist)
- Added [Uninstall guide](/docs/lambda/uninstall)

## October 29th, 2021

Version hash: `3.0.0-lambda.42+838a7a013`  
Lambda version: '2021-10-29'

- Merged changes from Remotion 2.5.1

## October 27th, 2021

Version hash: `3.0.0-lambda.37+874f731d5`  
Lambda version: '2021-10-27'

- Added a new `saveBrowserLogs` / `--save-browser-logs` option for dumping browser logs to an S3 bucket (you are responsible for cleaning up the logs if you enable this option!)
- Fixed a bug where `NoSuchKey` exception could be thrown when calling `getRenderProgress()`
- Merged changes from Remotion 2.5

## October 21st, 2021

Version hash: `3.0.0-lambda.25+9573ee628`

- You can now import the functions `getRenderProgress()`, `renderVideoOnLambda()`, and `renderStillOnLambda()` via `@remotion/lambda/client` free of Node.JS dependencies. That means they should be importable in the browser and React Native and should be lightweight to bundle. This is not yet tested well, let us know your experiences!
- When rendering a video via the Lambda CLI, FFMPEG is no longer required.
- From `main` branch: Calling `getInputProps()` from `remotion` package on the server will no longer fail, but warn and return an empty object.
- Added a way to disable chunk optimization and added some explainer graphics for what chunk optimization is - full doc coming later.
- Pinned exact Remotion versions to avoid a version mismatch with Yarn

## October 20th, 2021

Version hash: `3.0.0-lambda.2+a97302554`

- Updated with all the changes from main branch.

## October 7th, 2021

Version hash: `2.5.0-alpha.da8c43b8`

_Note: This version in broken. Don't use it._

- A new `privacy` field determines if the video will be public of private once it's rendered. No default - this field is mandatory
- New `overallProgress` field in `getRenderProgress()` which can be used to display a progress bar to end users
- The `getSites()` method returns a property `sizeInBytes` which was previously `size`.
- The `deleteSite()` method returns a property `totalSizeInBytes` which was previously `totalSize`.
- Lambda layers are now hosted in a dedicated AWS account
- Documented `getSites()` and `deleteSite()` methods
- Improved progress display for `npx remotion lambda` command
- Now showing estimated cost for `npx remotion lambda` command
- Using the `ANGLE` OpenGL renderer for Chrome instead of SwiftShader

## October 3rd, 2021

Version hash: `2.5.0-alpha.5da9a754`

Refactor of the Lambda layer architecture to bring the following benefits:

- Free up more than 200 MB in the `/tmp` directory to allow for longer videos to be rendered
- Avoid having to unzip Chromium and FFMPEG on every function launch, saving 300-400ms on every function launch
- Removed the need for `lambda:ListLayers`, `lambda:DeleteLayerVersion`, `lambda:GetLayerVersion` and `lambda:PublishLayerVersion` permission.
- Removed the need to call `ensureLambdaBinaries()`. The function and docs for it have been deleted, remove it from your implementation as well. You also don't need to pass `layerArn` to `deployFunction` anymore either.

Also:

- Fixed a bug where a `ENOENT` exception could be thrown during render
- Improved time to deploy a function by removing need to bundle the function first.
- Removed `esbuild`, `zip-lib` and `p-retry` dependendencies to make library more lightweight.

## October 1th, 2021

Version hash: `2.5.0-alpha.b52a746f`

- Renamed `deployProject()` to `deploySite()`.
- Exported `getSites()` and `deleteSite()` methods (not documented yet)
- Added `siteName` to the options of `deploySite()` - now you can define the name of your site yourself, and redeploy to keep the same site.
- Replace `estimatedLambdaInvokations` with `estimatedRenderLambdaInvokations`.
- Rename `bucketSize` to `renderSize`. This property is reporting the size of the render, not the size of the bucket.
- Added `downloadVideo()` API (not documented yet)
- If you add a filename to the end of the render command `npx remotion lambda render [url] [comp-name] out.mp4`, the video will be downloaded to your computer!
- `npx remotion lambda render` has a progress bar now. To continue to see all details, use the `--log=verbose` flag!

## September 15th, 2021

Version hash: `2.4.0-alpha.d3efed28`

- Added `framesPerLambda` setting to `renderVideoOnLambda()`.
- Added `--frames-per-lambda` option to `npx remotion lambda render` command.
- Added `enableCaching` and `webpackOverride` options to `deployProject()` function.
- Webpack override and webpack caching is now respected when deploying from the CLI

## September 14th, 2021

Version hash: `2.4.0-alpha.91579e8b`

- Fixes a bug where `npx remotion lambda policies user` could not be executed without AWS credentials which is a paradox.
- Fixes a bug where a render could fail with an error `Frame X was not rendered`

## September 7th, 2021

Version hash: `2.4.0-alpha.ec355aba`

- Pins the version of AWS SDKs, since a new version broke some things.

## September 6th, 2021

Version hash: `2.4.0-alpha.41bfd52d`

- Added more font families to support Arabic, Devanagari, Hebrew, Tamil, Thai scripts.
- Added input props to the render metadata that gets persisted for each render to help debugging.

## August 6th, 2021

Version hash: `2.3.0-alpha.0d814aad`

- Node.JS API is now fully documented
- Lambda function `name` was renamed to `functionName`
- Fix `remotion lambda policies validate` wrongly indicating that the `iam:GetUser` permission was not given
- `getDeployedLambdas()` was renamed to `getFunctions()`
- `getFunctionVersion()` was removed, use `getFunctionInfo()`
- New function `estimatePrice` is now available.
- Parameter `memorySize` was renamed to `memorySizeInMb` globally.
- New function [`renderStillOnLambda()`](/docs/lambda/renderstillonlambda) available for rendering a still image.
- New command [`npx remotion lambda still`](/docs/lambda/cli) for rendering a still image
- React component lifecycle change: When the component is mounting, initially `useCurrentFrame()` returns the frame that is initially being rendered, rather than just `0` and then updating to the frame that will be initially rendered.
- Includes all the changes from Remotion 2.2

## July 14th, 2021

- Emojis are now rendered using the Noto Color Emoji font
- Better price calculation
- Cleanup of S3 buckets after rendering

## July 6th, 2021

- You can now use `npx remotion lambda` instead of `npx remotion-lambda`.
- CLI supports the `-y` ('yes') flag for skipping confirmation of destructive commands.
- Stability, memory management and reliability improved
- Lambda runtime and Region selection now documented
- `renderVideoOnLambda()` and `getRenderProgress` now documented.
- `deployLambda()` has been renamed to `deployFunction()`
