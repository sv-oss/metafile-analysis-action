import { sync as globSync } from 'glob';
import bytes from 'bytes';
import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import path from 'path';
import { ActionConfig, breakdownMetafile, buildCommentForFile } from './format-comment';
import { GithubCommentor } from './github/make-pr-comment';

const getRequiredInput = (input: string): string =>core.getInput(input, { required: true, trimWhitespace: true });

export const analyze = async () => {
  core.info('Received analysis request!');
  console.log('Received analysis request (console)');
  const prNumber = context?.payload?.pull_request?.number;
  const ghToken = getRequiredInput('github-token');
  const metaDirectory = getRequiredInput('metafile-directory');
  const metaGlob = core.getInput('metafile-glob');
  const header = core.getInput('comment-header');
  const footer = core.getInput('comment-footer');

  if (!prNumber) {
    throw new Error('Metafile Analysis is only currently supported in the PR Context');
  }


  const files = globSync(metaGlob, {
    cwd: metaDirectory,
  });

  const actionConfig: ActionConfig = {
    thresholds: {
      critical: bytes.parse(core.getInput('comment-threshold-critical')),
      high: bytes.parse(core.getInput('comment-threshold-high')),
      medium: bytes.parse(core.getInput('comment-threshold-medium')),
      low: bytes.parse(core.getInput('comment-threshold-low')),
    },
    largeNodeModulesThreshold: bytes.parse(core.getInput('comment-large-node-modules-threshold')),
  };

  const comment: string[] = [];

  files.forEach(file => {
    const metadata = breakdownMetafile(path.join(metaDirectory, file));

    comment.push(buildCommentForFile(file, metadata, actionConfig));
  });

  const prCommenter = new GithubCommentor(
    getOctokit(ghToken),
    context.repo.owner,
    context.repo.repo,
  );

  await prCommenter.upsertComment(prNumber, `${header}

  ${comment.join('\n\n')}
  
  ${footer}`);
}
