// GitHub Contents/Git Data API 发布器：把本地 HEAD 的一棵树作为**一个原子提交**推上去。
// 为什么需要它：本机 git push 走 https 常因代理 TLS 抖动失败，而 gh api 通道稳定。
// 用法：node tools/gh-publish.mjs "提交说明" [仓库 owner/name]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const message = process.argv[2] || `deploy ${new Date().toISOString().slice(0, 10)}`;
const repo = process.argv[3] || process.env.GH_REPO || "xxc2007/Introduction-of-XinChen-Xiong";

const git = (...a) => execFileSync("git", a, { cwd: ROOT, maxBuffer: 64 << 20 });
const gh = (endpoint, payload, method = "POST") => {
  const body = payload === undefined ? null : JSON.stringify(payload);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (body === null) {
        return JSON.parse(execFileSync("gh", ["api", endpoint], { maxBuffer: 64 << 20 }).toString());
      }
      const f = join(tmpdir(), `ghpub-${Date.now()}-${attempt}.json`);
      writeFileSync(f, body);
      const out = execFileSync("gh", ["api", "--method", method, "--input", f, endpoint], { maxBuffer: 64 << 20 }).toString();
      unlinkSync(f);
      return JSON.parse(out);
    } catch (e) {
      if (attempt === 3) throw new Error(`gh api ${endpoint} 失败：${e.stderr?.toString() || e.message}`);
      execFileSync("sleep", [String(attempt * 2)]);
    }
  }
};

const listed = git("ls-tree", "-r", "--format=%(objectmode) %(path)", "HEAD").toString().trim().split("\n");
const entries = [];
for (const line of listed) {
  const space = line.indexOf(" ");
  const mode = line.slice(0, space);
  const path = line.slice(space + 1);
  const content = git("cat-file", "blob", `HEAD:${path}`).toString("base64");
  const blob = gh(`/repos/${repo}/git/blobs`, { content, encoding: "base64" });
  entries.push({ path, mode: mode === "100755" ? "100755" : "100644", type: "blob", sha: blob.sha });
  process.stdout.write(`\r  blob ${entries.length}/${listed.length}`);
}
console.log("");

const head = gh(`/repos/${repo}/git/ref/heads/main`).object.sha;
const baseTree = gh(`/repos/${repo}/git/commits/${head}`).tree.sha;
const tree = gh(`/repos/${repo}/git/trees`, { base_tree: baseTree, entries }).sha;
const commit = gh(`/repos/${repo}/git/commits`, { message, tree, parents: [head] }).sha;
gh(`/repos/${repo}/git/refs/heads/main`, { sha: commit, force: false }, "PATCH");
console.log(`  ✓ 已发布 ${entries.length} 个文件 → ${commit.slice(0, 7)}（原子提交，父节点 ${head.slice(0, 7)}）`);
