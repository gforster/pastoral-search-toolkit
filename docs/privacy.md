# Privacy and recovery

Projects are saved only in IndexedDB in the current browser profile on this device and origin. No account, cloud backup, central project or candidate database, analytics, advertising, tracking pixels, or automatic project transmission is present. The static hosting provider may log ordinary requests for application files.

Browser storage, downloaded JSON, ZIPs, Markdown and HTML are not encrypted. Someone with access to the browser profile or downloaded files may read them. Use a trusted device. Do not put credentials, donor records, background reports, allegations, full candidate files, or private pastoral-care histories into ordinary workbook fields.

Download Project Backup periodically and before moving devices, changing hosts, or clearing browser data. An import makes an independent project copy, not a synchronized committee workspace. The full ZIP includes the complete private JSON backup and internal documents: share selected, reviewed handouts rather than circulating the whole package to candidates or the congregation.

The first v2 visit copies valid legacy localStorage projects to IndexedDB in a transaction. It retains legacy originals for recovery and marks the import complete so later deletion cannot resurrect them. Corrupt originals are retained and offered as raw recovery downloads. Do not edit the same project in an older tab during migration; export that tab’s changes and import them as a separate copy if needed.

Saves display progress and report failures. If storage is unavailable or full, temporary work stays in memory and can be exported. A stale tab cannot overwrite or delete a newer revision. Reloading discards unsaved in-memory work, so export affected projects first. There is no automatic merging of concurrent edits.

The learning sample stays temporary until explicitly duplicated. The app may expose optional, browser-controlled readiness/navigation tools; it never invokes them to transmit project data on its own.

## Portable committee reviews

The local project now contains a separate committee directory, limited candidate context, evidence references, individual observations and committee decision history. Reviewer drafts live in a separate local `reviewWork` store. They are not uploaded, encrypted or synchronized. Use neutral record references instead of copying full background reports, allegations or private family/care histories.

A review packet contains one candidate assignment, selected evidence/context and at most its recipient’s name/ID. It contains no other reviews, directory or unrelated compensation. A completed review contains only that reviewer’s observations plus necessary matching identifiers. The chair imports files deliberately; duplicate/revised submissions require a choice, prior revisions remain available, and mismatched search/candidate/round snapshots are rejected. Files needing attention must be reselected after reloading the page.

Reviewer names are self-entered. Roles, expected reviewers and participation counts are not authenticated permission, voting eligibility, attendance or quorum. Local closed/released states guide independent review; a person with access to the browser/files can inspect the underlying data. A future server must enforce hidden reviews at the data-access layer.

Full project backup and full ZIP exports containing collaboration records display a private-export warning. Ordinary external artifacts do not include individual names/notes from collaboration records. The separate internal candidate meeting sheet may include released reviews and decisions. Review it before sharing.

Reusable template exports omit candidates, reviews, temporary decisions, committee members, assignments and active-search/compensation fields. The export preview requires a human check of allowed free text; no parser can guarantee that a user has not placed a private name in an otherwise reusable governance paragraph.

Evidence URLs accept only HTTP(S), without URL credentials. The app never fetches or embeds linked evidence automatically. Following a link uses the external service and its own permissions. Keep the assignment’s context appropriate for its recipient. Exported files and paper copies cannot be recalled through future access revocation.

Offline editing/import/export works after the application is loaded. Reloading still requires access to the static application (local server or an available host); no service worker or guaranteed offline cache is installed.
