import { info } from '@actions/core';
import { getOctokit } from '@actions/github';

export class GithubApiWrapper {
  private static IdentifierComment =
    '<!-- metafile-analysis-action comment -->';

  constructor(
    private ghToken: string,
    private owner: string,
    private repo: string,
  ) {}

  private getOctokit() {
    return getOctokit(this.ghToken);
  }

  public async getPrData(prNumber: number) {
    const prData = await this.getOctokit().rest.pulls.get({
      owner: this.owner,
      pull_number: prNumber,
      repo: this.repo,
    });

    return prData.data;
  }

  public async upsertComment(prNumber: number, commentToMake: string) {
    const octokit = this.getOctokit();
    info(
      `Upserting comment for owner=${this.owner}, repo=${this.repo}, prNumber=${prNumber}`,
    );
    const baseRequest = {
      owner: this.owner,
      repo: this.repo,
    };

    const { data: reviewComments } = await octokit.rest.issues.listComments({
      ...baseRequest,
      issue_number: prNumber,
    });

    const comment = reviewComments.find((c) => {
      return c.body?.includes(GithubApiWrapper.IdentifierComment);
    });

    const commentBody = `${GithubApiWrapper.IdentifierComment}${commentToMake}`;

    if (comment) {
      info('Found existing comment - updating content');

      await octokit.rest.issues.updateComment({
        ...baseRequest,
        body: commentBody,
        comment_id: comment.id,
      });
    } else {
      info('First run - creating comment');

      await octokit.rest.issues.createComment({
        ...baseRequest,
        body: commentBody,
        issue_number: prNumber,
      });
    }
  }

  public async assignStatus(
    ref: string,
    conclusion: 'failure' | 'success',
    summary: string,
  ) {
    const checkName = 'Metafile Analysis';
    const octokit = this.getOctokit();
    const checks = await octokit.rest.checks.listForRef({
      owner: this.owner,
      repo: this.repo,
      ref: ref,
      check_name: checkName,
    });

    const request = {
      name: checkName,
      owner: this.owner,
      repo: this.repo,
      conclusion,
      output: {
        title: checkName,
        summary,
      },
    };

    if (checks.data.check_runs.length !== 1) {
      await octokit.rest.checks.create({ ...request, head_sha: ref });
    } else {
      await octokit.rest.checks.update({
        check_run_id: checks.data.check_runs[0].id,
        ...request,
      });
    }
  }
}
