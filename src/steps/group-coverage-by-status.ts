import { summarizeMetafiles } from '.';
import { ActionConfig } from '../config';
import { buildMetadataForFile } from '../format-comment';
import { labelForStatus } from '../status-data';

export type GroupCoverageByStatusRequest = {
  coverageFiles: Awaited<ReturnType<(typeof summarizeMetafiles)['execute']>>;
  thresholds: ActionConfig;
};

export const execute = async ({
  coverageFiles,
  thresholds,
}: GroupCoverageByStatusRequest) => {
  const commentsByStatus: Record<
  string,
  ReturnType<typeof buildMetadataForFile>[]
  > = {};

  coverageFiles.forEach((file) => {
    const data = buildMetadataForFile(file!.filePath, [file!], thresholds);
    if (!(labelForStatus(data.status) in commentsByStatus)) {
      commentsByStatus[labelForStatus(data.status)] = [];
    }

    commentsByStatus[labelForStatus(data.status)].push(data);
  });

  return commentsByStatus;
};
