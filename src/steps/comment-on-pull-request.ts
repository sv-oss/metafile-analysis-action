import { GithubApiWrapper } from "../github/api-wrapper";
import { Context } from "@actions/github/lib/context";

export type CommentOnPullRequestRequest = {
  githubApi: GithubApiWrapper;
  context: Context;
  commentToMake: string;
};

export const execute = async (req: CommentOnPullRequestRequest) => {
  const prNumber = req.context?.payload?.pull_request?.number;

  await req.githubApi.upsertComment(prNumber!, req.commentToMake);
};
