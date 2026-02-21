#!/bin/bash
set -euo pipefail

# Deploy project files to Strato web server via SFTP.
# Requires: lftp, and env vars SFTP_HOST, SFTP_USER, SFTP_PASS

for var in SFTP_HOST SFTP_USER SFTP_PASS; do
    if [ -z "${!var:-}" ]; then
        echo "Error: $var is not set" >&2
        exit 1
    fi
done

cd "$(dirname "$0")"

echo "Deploying to $SFTP_HOST..."

lftp -u "$SFTP_USER","$SFTP_PASS" sftp://"$SFTP_HOST" -e "
    set sftp:auto-confirm yes
    set sftp:connect-program 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
    mirror -R --only-newer --verbose --exclude .git/ --exclude deploy.sh --exclude .gitignore . /
    quit
"

echo "Deploy complete."
