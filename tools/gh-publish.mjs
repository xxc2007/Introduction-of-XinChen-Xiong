// Compatibility entry point. Standard Git transport preserves commits, deletions and file modes.
// No Contents/Git Data API fallback: never invent a new commit after a push failure.
import {execFileSync} from 'node:child_process';
try {
  const result=execFileSync('git',['push','--porcelain','origin','HEAD:main'],{cwd:process.cwd(),encoding:'utf8',stdio:['ignore','pipe','pipe']});
  process.stdout.write(result);
} catch(error) {
  process.stderr.write('Git push failed. Deployment stopped; reconcile the remote branch before retrying.\n');
  process.stderr.write(error.stderr?.toString()||'');
  process.exitCode=1;
}
