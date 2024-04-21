import * as core from '@actions/core';
import { context } from '@actions/github';
import { extractConfig } from './config';
import { GithubApiWrapper } from './github/api-wrapper';
import { statusFromString } from './status-data';
import {
  buildComment,
  checkoutBranch,
  commentOnPullRequest,
  compareFileSize,
  groupCoverageByStatus,
  generateMetafiles,
  generateSummary,
  getComparisonBranch,
  summarizeMetafiles,
  assignStatusCheck,
} from './steps';

const getRequiredInput = (input: string): string =>
  core.getInput(input, { required: true, trimWhitespace: true });

export const analyze = async () => {
  const metaDirectory = getRequiredInput('metafile-directory');
  const metaGlob = core.getInput('metafile-glob');
  const generateMetafilesCommand = getRequiredInput(
    'generate-metafiles-command',
  );
  const githubToken = getRequiredInput('github-token');
  const config = extractConfig();

  core.info('Starting execution');

  await generateMetafiles.execute({ command: generateMetafilesCommand });
  core.info('Generated metafiles for latest');

  const latestCoverage = await summarizeMetafiles.execute({
    directory: metaDirectory,
    glob: metaGlob,
  });
  core.info('parsed latest coverage');

  const comparisonBranch = await getComparisonBranch.execute({
    context,
  });

  core.info(`Derived comparison branch as ${comparisonBranch}`);

  let fileDeltas = '';

  if (comparisonBranch) {
    await checkoutBranch.execute(comparisonBranch);
    core.info('Checked out comparison branch');
    await generateMetafiles.execute({ command: generateMetafilesCommand });
    core.info('Generating metafiles for comparison');

    const previousCoverage = await summarizeMetafiles.execute({
      directory: metaDirectory,
      glob: metaGlob,
    });
    core.info('Parsed previous coverage');

    fileDeltas = await compareFileSize.execute({
      previousCoverage,
      latestCoverage,
      config,
    });

    core.info('Generated file size delta analysis');
    await checkoutBranch.execute(context.payload.pull_request!.head.ref);
  }

  const githubApi = new GithubApiWrapper(
    githubToken,
    context.repo.owner,
    context.repo.repo,
  );

  const groupedCoverage = await groupCoverageByStatus.execute({
    coverageFiles: latestCoverage,
    thresholds: config,
  });
  core.info('Grouped current details by status');

  const metafileSummary = await generateSummary.execute({
    groupedCoverage,
    actionConfig: config,
    fileCount: latestCoverage.length,
  });
  core.info('Generated a summary of the latest values');

  const commentToMake = await buildComment.execute({
    fileDeltas,
    metafileSummary,
  });

  await commentOnPullRequest.execute({ commentToMake, githubApi, context });

  await assignStatusCheck.execute({
    actionConfig: config,
    context,
    latestCoverage,
    markFailures: core.getBooleanInput('check-mark-failure'),
    minFileCount: parseInt(getRequiredInput('check-mark-file-count'), 10),
    minThreshold: statusFromString(
      getRequiredInput('check-mark-min-threshold'),
    ),
  });
};
