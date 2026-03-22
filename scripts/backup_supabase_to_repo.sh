#!/usr/bin/env bash
set -euo pipefail

# Required env vars:
# - SUPABASE_DB_URL
# - BACKUP_REPO (owner/repo)
# - BACKUP_REPO_PAT
# Optional:
# - BACKUP_KEEP_COUNT (default: 7)
# - BACKUP_BRANCH (default: main)

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${BACKUP_REPO:?BACKUP_REPO is required}"
: "${BACKUP_REPO_PAT:?BACKUP_REPO_PAT is required}"

BACKUP_KEEP_COUNT="${BACKUP_KEEP_COUNT:-7}"
BACKUP_BRANCH="${BACKUP_BRANCH:-main}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
filename="supabase-backup-${timestamp}.dump"
remote_url="https://x-access-token:${BACKUP_REPO_PAT}@github.com/${BACKUP_REPO}.git"

workdir="$(mktemp -d)"
repo_dir="${workdir}/backup-repo"

cleanup() {
	rm -rf "${workdir}"
}
trap cleanup EXIT

echo "Preparing backup repo workspace..."
if git clone --quiet "${remote_url}" "${repo_dir}" 2>/dev/null; then
	cd "${repo_dir}"
else
	mkdir -p "${repo_dir}"
	cd "${repo_dir}"
	git init --quiet
	git checkout -b "${BACKUP_BRANCH}"
	git remote add origin "${remote_url}"
fi

mkdir -p snapshots
echo "Creating database snapshot ${filename}..."
# Use postgres:17 client to match Supabase server major version.
docker run --rm \
	--entrypoint pg_dump \
	-v "${repo_dir}/snapshots:/snapshots" \
	postgres:17 \
	"${SUPABASE_DB_URL}" --format=custom --no-owner --no-privileges --file "/snapshots/${filename}"
	
echo "Applying retention (keep latest ${BACKUP_KEEP_COUNT})..."
mapfile -t backup_files < <(ls -1 snapshots/supabase-backup-*.dump 2>/dev/null | sort)
if (( ${#backup_files[@]} > BACKUP_KEEP_COUNT )); then
	delete_count=$((${#backup_files[@]} - BACKUP_KEEP_COUNT))
	for ((i=0; i<delete_count; i++)); do
		rm -f "${backup_files[$i]}"
	done
fi

git add snapshots/
if git diff --cached --quiet; then
	echo "No changes to commit."
	exit 0
fi

git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
	commit -m "Backup Supabase snapshot ${timestamp}"
git push origin "HEAD:${BACKUP_BRANCH}"
echo "Backup pushed successfully."
