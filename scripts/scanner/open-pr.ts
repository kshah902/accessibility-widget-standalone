/**
 * Generic helper: commit a set of file changes to a new branch on a GitHub
 * repo and open a PR, via the GitHub REST API (not local git) so it works
 * against any of the client repos without needing them checked out with
 * push access configured for whichever token is running this.
 *
 * Auth: reads a token from GITHUB_BOT_TOKEN (falls back to GITHUB_TOKEN).
 * Works the same whether that token is a classic/fine-grained PAT from a
 * dedicated bot account, or a GitHub App installation token — this module
 * doesn't care how the token was minted, only that it has `contents:write`
 * and `pull_requests:write` on the target repo.
 */

import { Octokit } from '@octokit/rest'

export interface FileChange {
  path: string
  content: string
}

export interface OpenPrOptions {
  repo: string // "owner/name"
  branch: string
  baseBranch?: string // defaults to the repo's default branch
  title: string
  body: string
  changes: FileChange[]
}

function getToken(): string {
  const token = process.env.GITHUB_BOT_TOKEN || process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error(
      'Set GITHUB_BOT_TOKEN (or GITHUB_TOKEN) to a token with contents:write + pull_requests:write on the target repo.'
    )
  }
  return token
}

export async function openFixPr(opts: OpenPrOptions): Promise<string> {
  const [owner, repo] = opts.repo.split('/')
  if (!owner || !repo) throw new Error(`Expected "owner/name", got "${opts.repo}"`)

  const octokit = new Octokit({ auth: getToken() })

  const repoInfo = await octokit.repos.get({ owner, repo })
  const baseBranch = opts.baseBranch ?? repoInfo.data.default_branch

  const baseRef = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` })
  const baseSha = baseRef.data.object.sha

  // Reuse the branch if it already exists (idempotent re-runs), else create it.
  try {
    await octokit.git.getRef({ owner, repo, ref: `heads/${opts.branch}` })
  } catch {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${opts.branch}`,
      sha: baseSha,
    })
  }

  for (const change of opts.changes) {
    let existingSha: string | undefined
    try {
      const existing = await octokit.repos.getContent({
        owner,
        repo,
        path: change.path,
        ref: opts.branch,
      })
      if (!Array.isArray(existing.data) && existing.data.type === 'file') {
        existingSha = existing.data.sha
      }
    } catch {
      // file doesn't exist yet on this branch — fine, this is a create
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: change.path,
      message: `fix(a11y): ${change.path}`,
      content: Buffer.from(change.content, 'utf-8').toString('base64'),
      branch: opts.branch,
      sha: existingSha,
    })
  }

  const existingPrs = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${opts.branch}`,
    state: 'open',
  })
  if (existingPrs.data.length > 0) {
    return existingPrs.data[0].html_url
  }

  const pr = await octokit.pulls.create({
    owner,
    repo,
    title: opts.title,
    body: opts.body,
    head: opts.branch,
    base: baseBranch,
  })

  return pr.data.html_url
}
