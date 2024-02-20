import { context, getOctokit } from "@actions/github";

type OctoKit = ReturnType<typeof getOctokit>;

export class GithubCommentor {
  private static IdentifierComment = '<!-- metafile-analysis-action comment -->';

  constructor(private octokit: OctoKit, private owner: string, private repo: string) {

  }
  public async getPrData(prNumber: number) {
    const prData = await this.octokit.rest.pulls.get({
      owner: this.owner,
      pull_number: prNumber,
      repo: this.repo,
    });

    return prData.data;
  }

  public async upsertComment(prNumber: number, commentToMake: string) {
    const baseRequest = {
      owner: this.owner,
      repo: this.repo,
    };

    const { data: reviewComments } = await this.octokit.rest.pulls.listReviewComments({
      ...baseRequest,
      pull_number: prNumber,
    });

    const comment = reviewComments.find(comment => {
      return comment.body.startsWith(GithubCommentor.IdentifierComment);
    });

    const commentBody = `${GithubCommentor.IdentifierComment}<br />${commentToMake}`;

    if (comment) {
      await this.octokit.rest.issues.updateComment({
        ...baseRequest,
        body: commentBody,
        comment_id: comment.id,
      });
    } else {
      await this.octokit.rest.issues.createComment({
        ...baseRequest,
        body: commentBody,
        issue_number: prNumber,
      });
    }
  }
}