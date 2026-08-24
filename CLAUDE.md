# PomPom — project notes

Read these first: `HANDOFF.md` if it exists (the latest session's state and what
is next), then `PLAN.md` for the current build plan and `DECISIONS.md` for what
was decided and why. `README.md` covers running, building and the icon.

## PomPom depends on keel

**keel** (github.com/AidinD/keel) is the suite's shared layer, linked as
`file:../keel` — so it must be checked out at `D:\Repo\Tools\keel`.

`npm install` does **not** fail when it is missing. npm 11 links a missing
`file:` dependency to a dangling symlink and exits 0, so a green install is not
evidence keel is there; the failure arrives later as `ERR_MODULE_NOT_FOUND` from
`npm run icon` or `npm run release`.

It is a devDependency: electron-vite inlines what the app uses rather than
resolving it at runtime, and `externalizeDepsPlugin` externalises `dependencies`
only. Editing keel changes PomPom immediately with no rebuild step — which also
means a change there can break a sibling, so run `npm test` in keel and
`npm run icon` here before assuming it is fine. The icon output is committed and
regenerating it should leave `resources/` with an empty diff.

The ellipse and the signed polygon stay in `scripts/generate-icon.mjs` rather
than moving to keel: keel has neither, and its `distPolygon` is unsigned with no
inside test, which a filled body cannot use.

## Releasing

`npm run release`, which is `scripts/release.mjs`. It refuses a dirty tree and a
version that is already released, using the shared guards from `keel/release`.

The second one matters more than it looks: electron-builder treats a release
older than two hours as untouchable, skips `latest.yml` with a notice buried in
its output, and **exits 0** — so publishing over an existing version is a failure
shaped exactly like a success, and installed copies keep being offered the old
build. Nib lost a whole release to that on 2026-08-24. Bump the version and
commit before releasing.
