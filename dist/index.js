"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/metafile-analysis.ts
var core3 = __toESM(require("@actions/core"));
var import_github2 = require("@actions/github");

// src/config.ts
var core = __toESM(require("@actions/core"));
var import_bytes = __toESM(require("bytes"));

// src/status-data.ts
var Status = /* @__PURE__ */ ((Status4) => {
  Status4[Status4["CRITICAL"] = 0] = "CRITICAL";
  Status4[Status4["HIGH"] = 1] = "HIGH";
  Status4[Status4["MEDIUM"] = 2] = "MEDIUM";
  Status4[Status4["LOW"] = 3] = "LOW";
  Status4[Status4["INFO"] = 4] = "INFO";
  return Status4;
})(Status || {});
var statusForSize = (size, thresholds) => {
  switch (true) {
    case size > thresholds.critical:
      return 0 /* CRITICAL */;
    case size > thresholds.high:
      return 1 /* HIGH */;
    case size > thresholds.medium:
      return 2 /* MEDIUM */;
    case size > thresholds.low:
      return 3 /* LOW */;
    default:
      return 4 /* INFO */;
  }
};
var emojiForStatus = (status) => {
  switch (status) {
    case 0 /* CRITICAL */:
      return "\u{1F6A8}";
    case 1 /* HIGH */:
      return "\u{1F6A9}";
    case 2 /* MEDIUM */:
      return "\u26A0\uFE0F";
    case 3 /* LOW */:
      return "\u26A0";
    case 4 /* INFO */:
      return "\u{1F7E2}";
    default:
      throw new Error(`[emojiForStatus] Unknown status "${status}" received`);
  }
};
var labelForStatus = (status) => {
  switch (status) {
    case 0 /* CRITICAL */:
      return "Critical";
    case 1 /* HIGH */:
      return "High";
    case 2 /* MEDIUM */:
      return "Medium";
    case 3 /* LOW */:
      return "Low";
    case 4 /* INFO */:
      return "Info";
    default:
      throw new Error(`[labelForStatus] Unknown status "${status}" received`);
  }
};
var statusFromString = (str) => {
  switch (str.toUpperCase()) {
    case "CRITICAL":
      return 0 /* CRITICAL */;
    case "HIGH":
      return 1 /* HIGH */;
    case "MEDIUM":
      return 2 /* MEDIUM */;
    case "LOW":
      return 3 /* LOW */;
    case "INFO":
      return 4 /* INFO */;
    default:
      throw new Error(`[statusFromString] Unknown status of "${str}" received`);
  }
};

// src/config.ts
var extractConfig = () => ({
  thresholds: {
    critical: import_bytes.default.parse(core.getInput("comment-threshold-critical")),
    high: import_bytes.default.parse(core.getInput("comment-threshold-high")),
    medium: import_bytes.default.parse(core.getInput("comment-threshold-medium")),
    low: import_bytes.default.parse(core.getInput("comment-threshold-low"))
  },
  largeNodeModulesThreshold: import_bytes.default.parse(
    core.getInput("comment-large-node-modules-threshold")
  ),
  commentMinThreshold: statusFromString(core.getInput("comment-min-threshold"))
});

// src/github/api-wrapper.ts
var import_core = require("@actions/core");
var import_github = require("@actions/github");
var GithubApiWrapper = class _GithubApiWrapper {
  constructor(ghToken, owner, repo) {
    this.ghToken = ghToken;
    this.owner = owner;
    this.repo = repo;
  }
  static {
    this.IdentifierComment = "<!-- metafile-analysis-action comment -->";
  }
  getOctokit() {
    return (0, import_github.getOctokit)(this.ghToken);
  }
  async getPrData(prNumber) {
    const prData = await this.getOctokit().rest.pulls.get({
      owner: this.owner,
      pull_number: prNumber,
      repo: this.repo
    });
    return prData.data;
  }
  async upsertComment(prNumber, commentToMake) {
    const octokit = this.getOctokit();
    (0, import_core.info)(
      `Upserting comment for owner=${this.owner}, repo=${this.repo}, prNumber=${prNumber}`
    );
    const baseRequest = {
      owner: this.owner,
      repo: this.repo
    };
    const { data: reviewComments } = await octokit.rest.issues.listComments({
      ...baseRequest,
      issue_number: prNumber
    });
    const comment = reviewComments.find((c) => {
      return c.body?.includes(_GithubApiWrapper.IdentifierComment);
    });
    const commentBody = `${_GithubApiWrapper.IdentifierComment}${commentToMake}`;
    if (comment) {
      (0, import_core.info)("Found existing comment - updating content");
      await octokit.rest.issues.updateComment({
        ...baseRequest,
        body: commentBody,
        comment_id: comment.id
      });
    } else {
      (0, import_core.info)("First run - creating comment");
      await octokit.rest.issues.createComment({
        ...baseRequest,
        body: commentBody,
        issue_number: prNumber
      });
    }
  }
  async assignStatus(ref, conclusion, summary) {
    const checkName = "Metafile Analysis";
    const octokit = this.getOctokit();
    const checks = await octokit.rest.checks.listForRef({
      owner: this.owner,
      repo: this.repo,
      ref,
      check_name: checkName
    });
    const request = {
      name: checkName,
      owner: this.owner,
      repo: this.repo,
      conclusion,
      output: {
        title: checkName,
        summary
      }
    };
    if (checks.data.check_runs.length !== 1) {
      await octokit.rest.checks.create({ ...request, head_sha: ref });
    } else {
      await octokit.rest.checks.update({
        check_run_id: checks.data.check_runs[0].id,
        ...request
      });
    }
  }
};

// src/steps/assign-status-check.ts
var assign_status_check_exports = {};
__export(assign_status_check_exports, {
  execute: () => execute
});
var execute = async (req) => {
  if (!req.markFailures) return;
  const minSize = req.actionConfig.thresholds[labelForStatus(
    req.minThreshold
  ).toLowerCase()];
  const failedFiles = req.latestCoverage.filter(
    (cov) => cov.totalSize > minSize
  );
  const success = failedFiles.length < req.minFileCount;
  if (!success) {
    throw new Error(
      `Metafile Analysis was successful, however ${failedFiles.length} file(s) were worse than the threshold of ${labelForStatus(req.minThreshold)} (allowed: ${req.minFileCount})`
    );
  }
};

// src/steps/build-comment.ts
var build_comment_exports = {};
__export(build_comment_exports, {
  execute: () => execute2
});
var core2 = __toESM(require("@actions/core"));
var execute2 = async (req) => {
  const header = core2.getInput("comment-header");
  const footer = core2.getInput("comment-footer");
  return `${header ?? "<h2>Metadata File Analysis</h2>"}

  ${req.displaySummary ? `
  <h3>Summary</h3>

${req.metafileSummary.summary}
` : ""}
${req.displayDeltas ? req.fileDeltas : ""}

${req.displayKeyIssues ? req.metafileSummary.keyIssues : ""}

${footer}

<p align="right">Report generated by <a href="https://github.com/sv-oss/metafile-analysis-action" target="_blank">sv-oss/metafile-analysis-action</a></p>`;
};

// src/steps/checkout-branch.ts
var checkout_branch_exports = {};
__export(checkout_branch_exports, {
  execute: () => execute3
});
var import_child_process = require("child_process");
async function execute3(targetBranch) {
  (0, import_child_process.execSync)("git fetch --all --depth=1 > /dev/null");
  (0, import_child_process.execSync)(`git checkout -f ${targetBranch} > /dev/null`);
}

// src/steps/comment-on-pull-request.ts
var comment_on_pull_request_exports = {};
__export(comment_on_pull_request_exports, {
  execute: () => execute4
});
var execute4 = async (req) => {
  const prNumber = req.context?.payload?.pull_request?.number;
  await req.githubApi.upsertComment(prNumber, req.commentToMake);
};

// src/steps/compare-file-size.ts
var compare_file_size_exports = {};
__export(compare_file_size_exports, {
  execute: () => execute5
});
var import_bytes2 = __toESM(require("bytes"));

// src/utils/math.ts
var toDecimalPlaces = (v, decimals) => {
  const power = Math.pow(10, decimals);
  return Math.round(v * power) / power;
};

// src/utils/table.ts
var Table = class {
  constructor(columns) {
    this.columns = columns;
    this.rows = [];
    this.rows = [];
  }
  addRow(value) {
    this.rows.push(value);
  }
  addRows(...values) {
    this.rows.push(...values);
  }
  render() {
    return [
      // headers
      `| ${this.columns.map((v) => `<strong>${v}</strong>`).join(" | ")} |`,
      // line break to indicate headers
      `| ${this.columns.map(() => "---").join(" | ")} |`,
      // actual data
      ...this.rows.map((row) => `| ${row.join(" | ")} |`)
    ].join("\n");
  }
};

// src/steps/compare-file-size.ts
var execute5 = async (req) => {
  return generateSummary({ ...compareFileSize(req), config: req.config });
};
var compareFileSize = ({
  previousCoverage,
  latestCoverage
}) => {
  const removedFiles = [];
  const addedFiles = [];
  const differentFiles = [];
  latestCoverage.forEach((file) => {
    const existingResult = previousCoverage.find(
      (latestFile) => file.filePath === latestFile.filePath
    );
    if (!existingResult) {
      addedFiles.push(file);
      return;
    }
    if (file.totalSize !== existingResult.totalSize || file.srcFile.size !== existingResult.srcFile.size) {
      differentFiles.push({ prev: existingResult, curr: file });
    }
  });
  previousCoverage.forEach((file) => {
    const isPersisted = latestCoverage.some(
      (latestFile) => file.filePath === latestFile.filePath
    );
    if (!isPersisted) {
      removedFiles.push(file);
    }
  });
  return { removedFiles, addedFiles, differentFiles };
};
var generateSummary = ({
  removedFiles,
  addedFiles,
  differentFiles,
  config
}) => {
  let comment = "";
  if (differentFiles.length) {
    const table = new Table(["St.", "File", "Status", "Size (delta)"]);
    differentFiles.forEach((file) => {
      const currentSize = file.curr.totalSize;
      const status = statusForSize(currentSize, config.thresholds);
      const prevStatus = statusForSize(file.prev.totalSize, config.thresholds);
      const deltaPercentage = currentSize / file.prev.totalSize * 100;
      const deltaDiff = Math.abs(currentSize - file.prev.totalSize);
      let deltaRender = `\u2B07\uFE0F -${toDecimalPlaces(100 - deltaPercentage, 2)}%, -${(0, import_bytes2.default)(deltaDiff)}`;
      if (deltaPercentage > 100) {
        deltaRender = `\u{1F53A} +${toDecimalPlaces(deltaPercentage - 100, 2)}%, +${(0, import_bytes2.default)(deltaDiff)}`;
      }
      table.addRow([
        `${emojiForStatus(prevStatus)} \u2192 ${emojiForStatus(status)}`,
        file.curr.filePath,
        labelForStatus(status),
        `${(0, import_bytes2.default)(currentSize)} (${deltaRender})`
      ]);
    });
    comment = comment.concat(`
<h3>Updated Files:</h3>

${table.render()}`);
  }
  if (addedFiles.length) {
    const table = new Table(["St.", "File", "Status", "Size"]);
    addedFiles.forEach((file) => {
      const currentSize = file.totalSize;
      const status = statusForSize(currentSize, config.thresholds);
      table.addRow([
        emojiForStatus(status),
        file.filePath,
        labelForStatus(status),
        (0, import_bytes2.default)(currentSize)
      ]);
    });
    comment = comment.concat(`
<h3>New Files:</h3>

${table.render()}`);
  }
  if (removedFiles.length) {
    const table = new Table(["St.", "File", "Status", "Size"]);
    removedFiles.forEach((file) => {
      const currentSize = file.totalSize;
      const status = statusForSize(currentSize, config.thresholds);
      table.addRow([
        emojiForStatus(status),
        file.filePath,
        labelForStatus(status),
        (0, import_bytes2.default)(currentSize)
      ]);
    });
    comment = comment.concat(`
<h3>Deleted Files:</h3>

${table.render()}`);
  }
  return comment;
};

// src/steps/group-coverage-by-status.ts
var group_coverage_by_status_exports = {};
__export(group_coverage_by_status_exports, {
  execute: () => execute6
});

// src/format-comment.ts
var import_fs = require("fs");
var import_path = __toESM(require("path"));
var import_bytes3 = __toESM(require("bytes"));
var toKb = (size) => (0, import_bytes3.default)(size);
function buildMetadataForFile(fileName, metafile, actionConfig) {
  const metadata = metafile[0];
  const largerNodeMods = metadata.nodeModules.filter(
    (mod) => mod.size > actionConfig.largeNodeModulesThreshold
  );
  const status = statusForSize(metadata.totalSize, actionConfig.thresholds);
  return {
    status,
    totalSize: metadata.totalSize,
    fileName,
    comment: `<details><summary>${fileName} <b>(${toKb(metadata.totalSize)})</b> ${emojiForStatus(status)}
    </summary>
  
  | Description | Size |
  |--------|--------|
  | **Total Size** | ${toKb(metadata.totalSize)} |
  | **Source Files** | ${toKb(metadata.srcFile.size)} |
  | **node_modules** | ${toKb(metadata.totalSize - metadata.srcFile.size)} |
  ${largerNodeMods.length ? largerNodeMods.map((mod) => `| <li>${mod.name}</li> | ${toKb(mod.size)} |`).join("\n") : ""}
  </details>
    `
  };
}
function breakdownMetafile(filePath, directory) {
  let srcSize = 0;
  const topLevelNodeModules = {};
  const metafile = JSON.parse(
    (0, import_fs.readFileSync)(import_path.default.join(directory, filePath), "utf-8")
  );
  return Object.entries(
    metafile.outputs
  ).map(([outputFile, { inputs, bytes: totalSize }]) => {
    if (outputFile.endsWith(".map")) return;
    Object.entries(inputs).forEach(([key, value]) => {
      if (key.startsWith("node_modules")) {
        const [, host, module2] = key.split("/");
        let objKey = host;
        if (host.startsWith("@")) {
          objKey = `${host}/${module2}`;
        }
        if (!topLevelNodeModules[objKey]) {
          topLevelNodeModules[objKey] = 0;
        }
        topLevelNodeModules[objKey] += value.bytesInOutput;
      } else {
        srcSize += value.bytesInOutput;
      }
    });
    const nodeModules = Object.entries(topLevelNodeModules).map(
      ([name, size]) => ({ name, size })
    );
    nodeModules.sort((a, b) => b.size - a.size);
    return {
      nodeModules,
      totalSize,
      srcFile: {
        size: srcSize
      },
      filePath: filePath.replace(".meta.json", "")
    };
  }).filter((i) => !!i);
}

// src/steps/group-coverage-by-status.ts
var execute6 = async ({
  coverageFiles,
  thresholds
}) => {
  const commentsByStatus = {};
  coverageFiles.forEach((file) => {
    const data = buildMetadataForFile(file.filePath, [file], thresholds);
    if (!(labelForStatus(data.status) in commentsByStatus)) {
      commentsByStatus[labelForStatus(data.status)] = [];
    }
    commentsByStatus[labelForStatus(data.status)].push(data);
  });
  return commentsByStatus;
};

// src/steps/generate-metafiles.ts
var generate_metafiles_exports = {};
__export(generate_metafiles_exports, {
  execute: () => execute7
});
var import_child_process2 = require("child_process");
function execute7({ command }) {
  (0, import_child_process2.execSync)(`${command} > /dev/null`);
}

// src/steps/generate-summary.ts
var generate_summary_exports = {};
__export(generate_summary_exports, {
  execute: () => execute8
});
var import_bytes4 = __toESM(require("bytes"));
var execute8 = async (req) => {
  const summaryTable = buildSummaryTable(req);
  const keyIssues = buildKeyIssues(req);
  return {
    summary: summaryTable.render(),
    keyIssues
  };
};
function buildSummaryTable({
  groupedCoverage,
  actionConfig,
  fileCount
}) {
  const table = new Table([
    "St.",
    "Level",
    "Range",
    "Percentage",
    "Count / Total"
  ]);
  Object.values(Status).filter((v) => isNaN(v)).forEach((key) => {
    const type = statusFromString(key);
    groupedCoverage[labelForStatus(type)]?.sort(
      (a, b) => b.totalSize - a.totalSize
    );
    const count = groupedCoverage[labelForStatus(type)]?.length ?? 0;
    const minSize = actionConfig.thresholds[labelForStatus(
      type
    ).toLowerCase()];
    let percentage = count / fileCount * 100;
    if (isNaN(percentage)) {
      percentage = 0;
    }
    table.addRow([
      emojiForStatus(type),
      labelForStatus(type),
      minSize ? "> " + (0, import_bytes4.default)(
        actionConfig.thresholds[labelForStatus(
          type
        ).toLowerCase()]
      ) : "",
      `${toDecimalPlaces(count / fileCount * 100, 2)}%`,
      `${count} / ${fileCount}`
    ]);
  });
  return table;
}
function buildKeyIssues({
  groupedCoverage,
  actionConfig
}) {
  const { ...newCoverage } = groupedCoverage;
  Object.keys(newCoverage).forEach((key) => {
    const keyAsStatus = statusFromString(key);
    if (keyAsStatus > actionConfig.commentMinThreshold) {
      delete newCoverage[key];
    }
  });
  const toDisplayBreakdown = Object.values(newCoverage);
  return `${toDisplayBreakdown.flat().length > 0 ? "<h3>Key issues</h3>" : ""}
  
  ${toDisplayBreakdown.reverse().map(
    (comments) => comments.length > 0 ? `<h3>${emojiForStatus(comments[0].status)} ${labelForStatus(comments[0].status)} ${emojiForStatus(comments[0].status)}</h3>
${comments.map((c) => c.comment).join("\n\n")}` : ""
  ).join("\n\n")}`;
}

// src/steps/get-comparison-branch.ts
var get_comparison_branch_exports = {};
__export(get_comparison_branch_exports, {
  execute: () => execute9
});
async function execute9({
  context: context2
}) {
  return context2.payload.pull_request?.base.ref;
}

// src/steps/summarize-metafiles.ts
var summarize_metafiles_exports = {};
__export(summarize_metafiles_exports, {
  execute: () => execute10
});
var import_glob = require("glob");
async function execute10({ directory, glob }) {
  const files = (0, import_glob.globSync)(glob, {
    cwd: directory
  });
  return files.map((file) => breakdownMetafile(file, directory)).flat();
}

// src/metafile-analysis.ts
var getRequiredInput = (input) => core3.getInput(input, { required: true, trimWhitespace: true });
var analyze = async () => {
  const metaDirectory = getRequiredInput("metafile-directory");
  const metaGlob = core3.getInput("metafile-glob");
  const generateMetafilesCommand = getRequiredInput(
    "generate-metafiles-command"
  );
  const githubToken = getRequiredInput("github-token");
  const config = extractConfig();
  core3.info("Starting execution");
  await generate_metafiles_exports.execute({ command: generateMetafilesCommand });
  core3.info("Generated metafiles for latest");
  const latestCoverage = await summarize_metafiles_exports.execute({
    directory: metaDirectory,
    glob: metaGlob
  });
  core3.info("parsed latest coverage");
  const comparisonBranch = await get_comparison_branch_exports.execute({
    context: import_github2.context
  });
  core3.info(`Derived comparison branch as ${comparisonBranch}`);
  let fileDeltas = "";
  if (comparisonBranch) {
    try {
      await checkout_branch_exports.execute(comparisonBranch);
      core3.info("Checked out comparison branch");
      await generate_metafiles_exports.execute({ command: generateMetafilesCommand });
      core3.info("Generating metafiles for comparison");
      const previousCoverage = await summarize_metafiles_exports.execute({
        directory: metaDirectory,
        glob: metaGlob
      });
      core3.info("Parsed previous coverage");
      fileDeltas = await compare_file_size_exports.execute({
        previousCoverage,
        latestCoverage,
        config
      });
      core3.info("Generated file size delta analysis");
    } catch (e) {
      core3.info("Error caught while completing execution on comparison branch - delta will not be parsed");
    } finally {
      await checkout_branch_exports.execute(import_github2.context.payload.pull_request.head.ref);
    }
  }
  const githubApi = new GithubApiWrapper(
    githubToken,
    import_github2.context.repo.owner,
    import_github2.context.repo.repo
  );
  const groupedCoverage = await group_coverage_by_status_exports.execute({
    coverageFiles: latestCoverage,
    thresholds: config
  });
  core3.info("Grouped current details by status");
  const metafileSummary = await generate_summary_exports.execute({
    groupedCoverage,
    actionConfig: config,
    fileCount: latestCoverage.length
  });
  core3.info("Generated a summary of the latest values");
  const commentToMake = await build_comment_exports.execute({
    fileDeltas,
    metafileSummary,
    displaySummary: core3.getInput("display-summary") === "true",
    displayKeyIssues: core3.getInput("display-key-issues") === "true",
    displayDeltas: core3.getInput("display-deltas") === "true"
  });
  await comment_on_pull_request_exports.execute({ commentToMake, githubApi, context: import_github2.context });
  await assign_status_check_exports.execute({
    actionConfig: config,
    context: import_github2.context,
    latestCoverage,
    markFailures: core3.getBooleanInput("check-mark-failure"),
    minFileCount: parseInt(getRequiredInput("check-mark-file-count"), 10),
    minThreshold: statusFromString(
      getRequiredInput("check-mark-min-threshold")
    )
  });
};

// src/index.ts
void analyze();
