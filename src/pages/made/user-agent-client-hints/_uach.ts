export const UACH_HINTS = [
  "Sec-CH-UA",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Full-Version",
  "Sec-CH-UA-Full-Version-List",
  "Sec-CH-UA-Platform",
  "Sec-CH-UA-Platform-Version",
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Wow64",
  "Sec-CH-UA-Bitness",
  "Sec-CH-UA-Model",
  "CH-Save-Data",
  "Save-Data",
] as const;

export interface AcceptChBuildResult {
  acceptCh: string | null;
  displayHeader: string;
}

export function buildAcceptChHeader(
  searchParams: URLSearchParams,
  initialHints: readonly string[] = [],
): AcceptChBuildResult {
  if (searchParams.get("noheader") === "noheader") {
    return {
      acceptCh: null,
      displayHeader: "[not set]",
    };
  }

  const rawCh = searchParams.getAll("uach");
  const acceptCh = [...initialHints];

  for (const uach of rawCh) {
    if ((UACH_HINTS as readonly string[]).includes(uach)) {
      acceptCh.push(uach);
    }
  }

  const mergedTokens = acceptCh.join(", ");
  return {
    acceptCh: mergedTokens,
    displayHeader: `Accept-CH: ${mergedTokens}`,
  };
}
