import type { Context } from '@actions/github/lib/context';

export type GetComparisonBranchRequest = {
  context: Context;
};

export async function execute({
  context,
}: GetComparisonBranchRequest): Promise<string | undefined> {
  return context.payload.pull_request?.base.ref;
}
