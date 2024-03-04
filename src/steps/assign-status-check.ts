import { Context } from "@actions/github/lib/context";
import { BreakdownMetafileResponse } from "../format-comment";
import { Status, labelForStatus } from "../status-data";
import { ActionConfig } from "../config";
import { GithubApiWrapper } from "../github/api-wrapper";

export type AssignStatusCheckRequest = {
  readonly latestCoverage: BreakdownMetafileResponse[];
  readonly context: Context;
  readonly markFailures: boolean;
  readonly minFileCount: number;
  readonly minThreshold: Status;
  readonly actionConfig: ActionConfig;
};

export const execute = async (req: AssignStatusCheckRequest) => {
  // not marking failures - skip the step
  if (!req.markFailures) return;

  const minSize =
    req.actionConfig.thresholds[
      labelForStatus(
        req.minThreshold,
      ).toLowerCase() as keyof typeof req.actionConfig.thresholds
    ];

  const failedFiles = req.latestCoverage.filter(
    (cov) => cov.totalSize > minSize,
  );

  const success = failedFiles.length < req.minFileCount;

  if (!success) {
    throw new Error(
      `Metafile Analysis was successful, however ${failedFiles.length} file(s) were worse than the threshold of ${labelForStatus(req.minThreshold)} (allowed: ${req.minFileCount})`,
    );
  }
};
