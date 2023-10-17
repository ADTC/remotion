// Keep in sync with packages/cli/src/editor/components/UpdateCheck.tsx
type Bug = {
  title: string;
  description: string;
  link: string;
  versions: string[];
};

const bugs: Bug[] = [
  {
    title: "Broken Lambda",
    description: "Lambda rendering fails with IPv6 error.",
    link: "https://github.com/remotion-dev/remotion/pull/3019",
    versions: ["4.0.49"],
  },
  {
    title: "OffthreadVideo could crash",
    description:
      "On some videos, OffthreadVideo could crash without proper error handling.",
    link: "https://github.com/remotion-dev/remotion/pull/2882",
    versions: ["4.0.36", "4.0.37", "4.0.38"],
  },
  {
    title: "Slow OffthreadVideo performance",
    description:
      "Without an explicit cache size, the OffthreadVideo component would run with no cache.",
    link: "https://github.com/remotion-dev/remotion/pull/2882",
    versions: ["4.0.33", "4.0.34", "4.0.35", "4.0.36"],
  },
  {
    title: "<Thumbnail> component would crash",
    description:
      "<Thumbnail> component in a React app would crash if a <Sequence> was used.",
    link: "https://github.com/remotion-dev/remotion/pull/2944",
    versions: ["4.0.43", "4.0.42"],
  },
];

const getVersionBugs = (version: string) => {
  const selectedVersionBugs = bugs.filter((bug) => {
    return bug.versions.includes(version);
  });
  return selectedVersionBugs;
};

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET",
        "access-control-allow-headers": "Content-Type",
      },
    });
  }

  const urlParams = new URL(request.url).searchParams;

  const query = Object.fromEntries(urlParams);
  const v = query["v"].replace("v", "") as string;

  const bugs = getVersionBugs(v);

  return new Response(
    JSON.stringify({
      version: v,
      bugs,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
    }
  );
}

export const config = {
  runtime: "edge",
};
