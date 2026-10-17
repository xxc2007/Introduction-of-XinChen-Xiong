# Security and delivery operations

The existing design, public content and URLs are retained. GitHub main must exactly match the local Git revision before release. Use scripts/deploy.sh after committing reviewed changes; a failed push stops deployment. tools/deploy-release.mjs creates a root-owned version directory, precompresses text assets, switches the stable website path and verifies origin URLs. Previous releases and a rollback record are retained in /var/backups/site-upgrade-20261016. The first conversion from a physical directory to a symlink has a short cutover; subsequent symlink replacements are atomic. Do not describe this as a distributed zero-downtime transaction.

Deployment credentials belong in ignored .deploy.env (see .deploy.env.example). The historical parent memorial deploy script is replaced by the repository entry point. Do not restore www-data ownership or deploy through unreviewed legacy commands.

Cloudflare Full(strict), HTTPS redirects and TLS1.2 minimum are used. Only exact Cloudflare source ranges and local probes may access the named origin vhosts. Real IP processing trusts those source networks only. Comment write requests are rate-limited. CSP remains Report-Only for compatibility review; it is not a central report collection service.

The independent site-backup timer uses the existing private Azure backup account and only the backups/websites prefix. It keeps two static snapshots and fourteen comment snapshots, verifies uploaded checksums and checks an isolated SQLite restore. It refuses to grow total container storage beyond a 4 GB precautionary ceiling for visible active objects (Azure soft-delete retention can add billed storage and this is not an account billing cap). Existing backup prefixes for other applications are untouched. Private Artalk configuration and credential recovery must be managed separately; they are not included in the Azure snapshots. Run systemctl status site-backup.service and inspect its private status file to assess the last backup.

No paid monitoring agent, Log Analytics ingestion, new production database or additional hosting service is required. Student partner offers remain conditional on their own activation terms and any required user identity verification. Never classify a trial or spendable credit as a permanently free service.

Before committing asset updates, run `node scripts/prepare-release.mjs`. CI/deployment reject stale content-derived immutable URLs and dirty working trees. Review the generated HTML fingerprints, commit, and publish through a checked pull request.
