---
image: /generated/articles-docs-lambda-runtime.png
id: runtime
title: Runtime
slug: /lambda/runtime
crumb: "Lambda"
---

import {DefaultMemorySize} from '../../components/lambda/default-memory-size';
import {DefaultTimeout} from '../../components/lambda/default-timeout';

This page describes the environment that the Lambda function is running in.

## Node.JS Version

The lambda function will use a NodeJS version from the `18.x` release line.  
The Lambda runtime will get locked to

```
arn:aws:lambda:${region}::runtime:b97ad873eb5228db2e7d5727cd116734cc24c92ff1381739c4400c095404a2d3
```

if your user policy includes `lambda:PutRuntimeManagementConfig`, which is recommended.  
Otherwise, future updates to the runtime by AWS have the potential to break the function. If you don't have this permission in your policy, a warning will be printed.

<details>
<summary>
Changelog
</summary>
Before Remotion v4.0.0, the Node.JS version was <code>14.x</code>.
</details>

## Memory size

The default is <DefaultMemorySize/> MB. You can configure it by passing an argument to [`deployFunction()`](/docs/lambda/deployfunction) or by passing a `--memory` flag to the CLI when deploying a function.

## Timeout

The default is <DefaultTimeout /> seconds. You can configure it when calling [`deployFunction()`](/docs/lambda/deployfunction) or by passing a `--timeout` flag to the CLI when deploying a function.

Note that you probably don't need to increase it - Since the video is rendered by splitting it into many parts and those parts are rendered in parallel, there are rare cases where you need more than <DefaultTimeout /> seconds.

## Storage space

The function has between [512MB and 10GB of storage space](/docs/lambda/disk-size) in total available for video rendering depending on your configuration. Keep in mind that the concatenations of various chunks into one video takes place within a Lambda function, so the space must suffice for both the chunks and the output video.

## Core count / vCPUs

The amount of cores inside a Lambda is dependent on the amount of memory you give it. According to [this research](https://www.sentiatechblog.com/aws-re-invent-2020-day-3-optimizing-lambda-cost-with-multi-threading?utm_source=reddit&utm_medium=social&utm_campaign=day3_lambda), these are the tiers:

| Memory         | vCPUs |
| -------------- | ----- |
| 128 - 3008 MB  | 2     |
| 3009 - 5307 MB | 3     |
| 5308 - 7076 MB | 4     |
| 7077 - 8845 MB | 5     |
| 8846+ MB       | 6     |

You can render multiple frames at once inside a Lambda function by using the [`concurrencyPerLambda`](/docs/lambda/rendermediaonlambda#concurrencyperlambda) option.

## Chromium

The function already includes a running version of Chromium.
The browser was compiled including the proprietary codecs, so you can include MP4 videos into your project.

| Remotion version | Chrome version |
| ---------------- | -------------- |
| From 4.0.0       | 114.0.5731.1   |
| From 3.2.0       | 104.0.5112.64  |
| From 3.0.8       | 101.0.4951.68  |
| From 3.0.0       | 98.0.4758.139  |

## FFMPEG

Since Remotion 4.0, the function already includes an FFMPEG 6.0 binary that was compiled to support all [codecs](/docs/encoding) that Remotion supports.

<details>
<summary>
Before v4.0.0
</summary>
Version built from source: <code>N-104627-g40cf317d09</code> (corresponds to v4.4)  
Configuration:

<pre>
--prefix=/home/ec2-user/ffmpeg_build --pkg-config-flags=--static --extra-cflags=-I/home/ec2-user/ffmpeg_build/include --extra-ldflags=-L/home/ec2-user/ffmpeg_build/lib --extra-libs=-lpthread --extra-libs=-lm --bindir=/home/ec2-user/bin --enable-gpl --enable-libfdk-aac --enable-libfreetype --enable-libmp3lame --enable-libopus --enable-libvpx --enable-libx264 --enable-libx265 --enable-nonfree
</pre>
</details>

## Fonts

The function includes the following fonts:

- Noto Color Emoji
- Noto Sans Black
- Noto Sans Bold
- Noto Sans Regular
- Noto Sans SemiBold
- Noto Sans Thin
- Noto Sans Arabic Regular
- Noto Sans Devanagari Regular
- Noto Sans Hebrew Regular
- Noto Sans Tamil Regular
- Noto Sans Thai Regular

Since December 2021 the following fonts are also available **only on the `arm64` version of Remotion Lambda:**

- Noto Sans Simplified Chinese Regular
- Noto Sans Simplified Chinese Bold
- Noto Sans Traditional Chinese Regular
- Noto Sans Traditional Chinese Bold
- Noto Sans Korean Regular
- Noto Sans Korean Bold
- Noto Sans Japanese Regular
- Noto Sans Japanese Bold

If you'd like to use different fonts, we recommend using Webfonts.

While the set of default fonts that we can include must be kept small in order to save space, we are happy to hear feedback if you encounter a scenario where characters cannot be rendered.

## Customize layers

See: [Customize Lambda layers](/docs/lambda/custom-layers) to learn about how you can customize this stack.

## See also

- [Customize Lambda layers](/docs/lambda/custom-layers)
