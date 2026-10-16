# Security

Report security concerns privately through GitHub's repository security advisory interface. Do not include credentials or visitor data in public issues.

Production files are static and vendored. dependencies.json records their fixed versions, upstream sources and SHA-256 values. A dependency update requires updating both the lockfile and the deployed vendor files, followed by browser regression checks. Automatic deployment is intentionally not granted to dependency update workflows.

Deployment uses standard Git commits and verifies remote and deployed content. Credentials belong in ignored local configuration or narrowly scoped deployment secrets. Website processes must not own their executables, configuration or static release directories.
