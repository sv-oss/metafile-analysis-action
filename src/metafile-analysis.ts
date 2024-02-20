import { sync as globSync } from "glob";
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import path from "path";
import { breakdownMetafile, buildMetadataForFile } from "./format-comment";
import { GithubCommentor } from "./github/make-pr-comment";
import { extractConfig } from "./config";
import { Status, emojiForStatus, labelForStatus, statusFromString } from "./status-data";

const getRequiredInput = (input: string): string =>
  core.getInput(input, { required: true, trimWhitespace: true });

export const analyze = async () => {
  core.info("Received analysis request!");
  const prNumber = context?.payload?.pull_request?.number;
  const ghToken = getRequiredInput("github-token");
  const metaDirectory = getRequiredInput("metafile-directory");
  const metaGlob = core.getInput("metafile-glob");
  const header = core.getInput("comment-header");
  const footer = core.getInput("comment-footer");
  const minThreshold = statusFromString(core.getInput("comment-min-threshold"));

  if (!prNumber) {
    throw new Error(
      "Metafile Analysis is only currently supported in the PR Context",
    );
  }

  const files = globSync(metaGlob, {
    cwd: metaDirectory,
  });

  const actionConfig = extractConfig();

  const commentsByStatus: Record<
    string,
    ReturnType<typeof buildMetadataForFile>[]
  > = {};

  files.forEach((file) => {
    const metadata = breakdownMetafile(path.join(metaDirectory, file));
    const data = buildMetadataForFile(file, metadata, actionConfig);
    if (!(data.status in commentsByStatus)) {
      commentsByStatus[data.status] = [];
    }

    commentsByStatus[data.status].push(data);
  });

  const prCommenter = new GithubCommentor(
    getOctokit(ghToken),
    context.repo.owner,
    context.repo.repo,
  );

  const toMake = Object.values(Status)
    .map((type) => {
      commentsByStatus[type]?.sort((a, b) => b.totalSize - a.totalSize);
      return {
        type: type as Status,
        comments: (commentsByStatus[type] ?? []).map(c => c.comment),
      };
    })
    .filter((r) => r.comments?.length > 0 && r.type <= minThreshold);

  await prCommenter.upsertComment(
    prNumber,
    `${header}

  ${toMake.map(({ type, comments }) => `<h3>${labelForStatus(type)} (${emojiForStatus(type)})</h3>${comments.join("\n\n")}`).join("\n\n")}
  
  ${footer}`,
  );
};
