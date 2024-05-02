import * as core from '@actions/core';
import { generateSummary } from '.';

export type BuildCommentRequest = {
  readonly fileDeltas: string;
  readonly metafileSummary: Awaited<
  ReturnType<(typeof generateSummary)['execute']>
  >;
  readonly displaySummary: boolean;
  readonly displayDeltas: boolean;
  readonly displayKeyIssues: boolean;
};

export const execute = async (req: BuildCommentRequest) => {
  const header = core.getInput('comment-header');
  const footer = core.getInput('comment-footer');

  return `${header ?? '<h2>Metadata File Analysis</h2>'}

  ${req.displaySummary ? `
  <h3>Summary</h3>

${req.metafileSummary.summary}
` : ''}
${req.displayDeltas ? req.fileDeltas : ''}

${req.displayKeyIssues ? req.metafileSummary.keyIssues : ''}

${footer}

<p align="right">Report generated by <a href="https://github.com/sv-oss/metafile-analysis-action" target="_blank">sv-oss/metafile-analysis-action</a></p>`;
};
