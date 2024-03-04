import bytes from "bytes";
import { ActionConfig } from "../config";
import { emojiForStatus, labelForStatus, statusForSize } from "../status-data";
import { Table } from "../utils/table";
import { toDecimalPlaces } from "../utils/math";
import { BreakdownMetafileResponse } from "../format-comment";

export type CompareCoverageRequest = {
  readonly previousCoverage: BreakdownMetafileResponse[];
  readonly latestCoverage: BreakdownMetafileResponse[];
  readonly config: ActionConfig;
};

export const execute = async (req: CompareCoverageRequest) => {
  return generateSummary({ ...compareFileSize(req), config: req.config });
};

const compareFileSize = ({
  previousCoverage,
  latestCoverage,
}: CompareCoverageRequest) => {
  const removedFiles: BreakdownMetafileResponse[] = [];
  const addedFiles: BreakdownMetafileResponse[] = [];
  const differentFiles: {
    prev: BreakdownMetafileResponse;
    curr: BreakdownMetafileResponse;
  }[] = [];

  latestCoverage.forEach((file) => {
    const existingResult = previousCoverage.find(
      (latestFile) => file.filePath === latestFile.filePath,
    );

    // newly added file -> Add to addedFiles
    if (!existingResult) {
      addedFiles.push(file);
      return;
    }
    // If total size or src size is different - something is different. Can safely not compare node_modules size here
    // as srcSize + nodeSize = totalSize, and we've tested the other 2
    if (
      file.totalSize !== existingResult.totalSize ||
      file.srcFile.size !== existingResult.srcFile.size
    ) {
      differentFiles.push({ prev: existingResult, curr: file });
    }
  });

  previousCoverage.forEach((file) => {
    const isPersisted = latestCoverage.some(
      (latestFile) => file.filePath === latestFile!.filePath,
    );

    if (!isPersisted) {
      removedFiles.push(file);
    }
  });

  return { removedFiles, addedFiles, differentFiles };
};

const generateSummary = ({
  removedFiles,
  addedFiles,
  differentFiles,
  config,
}: ReturnType<typeof compareFileSize> & { config: ActionConfig }): string => {
  let comment = "";

  if (differentFiles.length) {
    const table = new Table(["St.", "File", "Status", "Size (delta)"]);
    differentFiles.forEach((file) => {
      const currentSize = file.curr.totalSize;
      const status = statusForSize(currentSize, config.thresholds);
      const prevStatus = statusForSize(file.prev.totalSize, config.thresholds);
      const deltaPercentage = (currentSize / file.prev!.totalSize) * 100;

      let deltaRender = `⬇️ -${toDecimalPlaces(100 - deltaPercentage, 2)}%`;
      if (deltaPercentage > 100) {
        deltaRender = `🔺 +${toDecimalPlaces(deltaPercentage - 100, 2)}%`;
      }

      table.addRow([
        `${emojiForStatus(prevStatus)} → ${emojiForStatus(status)}`,
        file.curr!.filePath,
        labelForStatus(status),
        `${bytes(currentSize)} (${deltaRender})`,
      ]);
    });

    comment = comment.concat(`\n<h3>Updated Files:</h3>\n\n${table.render()}`);
  }

  if (addedFiles.length) {
    const table = new Table(["St.", "File", "Status", "Size"]);

    addedFiles.forEach((file) => {
      const currentSize = file!.totalSize;
      const status = statusForSize(currentSize, config.thresholds);

      table.addRow([
        emojiForStatus(status),
        file!.filePath,
        labelForStatus(status),
        bytes(currentSize),
      ]);
    });

    comment = comment.concat(`\n<h3>New Files:</h3>\n\n${table.render()}`);
  }

  if (removedFiles.length) {
    const table = new Table(["St.", "File", "Status", "Size"]);

    removedFiles.forEach((file) => {
      const currentSize = file!.totalSize;
      const status = statusForSize(currentSize, config.thresholds);

      table.addRow([
        emojiForStatus(status),
        file!.filePath,
        labelForStatus(status),
        bytes(currentSize),
      ]);
    });

    comment = comment.concat(`\n<h3>Deleted Files:</h3>\n\n${table.render()}`);
  }

  return comment;
};
