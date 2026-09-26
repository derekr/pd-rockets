import { isReleaseTag } from "./release-tags";

const tag = Bun.argv[2];
if (!tag || !isReleaseTag(tag)) throw new Error(`Expected UTC date release tag vYYYY-MM-DD[-N], got ${tag ?? "none"}`);
