import bytes from "bytes";
import { groupCoverageByStatus } from ".";
import { ActionConfig } from "../config";
import {
  Status,
  emojiForStatus,
  labelForStatus,
  statusFromString,
} from "../status-data";
import { Table } from "../utils/table";
import { toDecimalPlaces } from "../utils/math";

export type GenerateSummaryRequest = {
  groupedCoverage: Awaited<
    ReturnType<(typeof groupCoverageByStatus)["execute"]>
  >;
  actionConfig: ActionConfig;
  fileCount: number;
};

export const execute = async (req: GenerateSummaryRequest) => {
  const summaryTable = buildSummaryTable(req);
  const keyIssues = buildKeyIssues(req);

  return {
    summary: summaryTable.render(),
    keyIssues,
  };
};

function buildSummaryTable({
  groupedCoverage,
  actionConfig,
  fileCount,
}: GenerateSummaryRequest) {
  const table = new Table([
    "St.",
    "Level",
    "Range",
    "Percentage",
    "Count / Total",
  ]);

  Object.values(Status)
    .filter((v) => isNaN(v as any))
    .forEach((key) => {
      const type = statusFromString(key as string);

      groupedCoverage[labelForStatus(type)]?.sort(
        (a, b) => b.totalSize - a.totalSize,
      );
      const count = groupedCoverage[labelForStatus(type)]?.length ?? 0;

      const minSize =
        actionConfig.thresholds[
          labelForStatus(
            type,
          ).toLowerCase() as keyof typeof actionConfig.thresholds
        ];
      let percentage = (count / fileCount) * 100;

      // handle 0/0 case
      if (isNaN(percentage)) {
        percentage = 0;
      }

      table.addRow([
        emojiForStatus(type),
        labelForStatus(type),
        minSize
          ? "> " +
            bytes(
              actionConfig.thresholds[
                labelForStatus(
                  type,
                ).toLowerCase() as keyof typeof actionConfig.thresholds
              ],
            )
          : "",
        `${toDecimalPlaces((count / fileCount) * 100, 2)}%`,
        `${count} / ${fileCount}`,
      ]);
    });

  return table;
}

function buildKeyIssues({
  groupedCoverage,
  actionConfig,
}: GenerateSummaryRequest) {
  const { ...newCoverage } = groupedCoverage;
  Object.keys(newCoverage).forEach((key) => {
    const keyAsStatus = statusFromString(key);
    if (keyAsStatus > actionConfig.commentMinThreshold) {
      delete newCoverage[key];
    }
  });

  const toDisplayBreakdown = Object.values(newCoverage);

  return `${toDisplayBreakdown.flat().length > 0 ? "<h3>Key issues</h3>" : ""}
  
  ${toDisplayBreakdown
    .reverse()
    .map((comments) =>
      comments.length > 0
        ? `<h3>${emojiForStatus(comments[0].status)} ${labelForStatus(comments[0].status)} ${emojiForStatus(comments[0].status)}</h3>
${comments.map((c) => c.comment).join("\n\n")}`
        : "",
    )
    .join("\n\n")}`;
}
