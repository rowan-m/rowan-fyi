const UNIFIED_PLATFORM: Readonly<Record<string, string>> = {
  Lin: "Linux; Android 10; K",
  Win: "Windows NT 10.0; Win64; x64",
  Mac: "Macintosh; Intel Mac OS X 10_15_7",
  "X11; C": "CrOS x86_64 14541.0.0",
  "X11; L": "X11; Linux x86_64",
};

const CHROME_UA_REGEX =
  /^Mozilla\/5\.0 \((?<platform>Lin|Win|Mac|X11; C|X11; L)[^)]*\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/(?<major>\d+)\.[\d.]+(?<mobile> Mobile)? Safari\/537\.36$/;

export interface ReducedUaResult {
  didReduce: "Yes" | "No";
  oldUA: string;
  newUA: string;
}

export function reduceUserAgent(userAgent: string | null): ReducedUaResult {
  const oldUA = userAgent ?? "";
  const matched = CHROME_UA_REGEX.exec(oldUA);

  if (matched?.groups) {
    const platformKey = matched.groups.platform;
    const major = matched.groups.major;
    const mobile = matched.groups.mobile ?? "";
    const unified = UNIFIED_PLATFORM[platformKey];
    if (unified && major) {
      const newUA = `Mozilla/5.0 (${unified}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0${mobile} Safari/537.36`;
      return {
        didReduce: "Yes",
        oldUA,
        newUA,
      };
    }
  }

  return {
    didReduce: "No",
    oldUA,
    newUA: oldUA,
  };
}
