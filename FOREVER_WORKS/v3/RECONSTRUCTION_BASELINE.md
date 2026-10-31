# Reconstruction baseline, 30 October 2026

Inspected branch HEAD f78cd1f5064f326b127ab525e0d80a82b69a6220 before production edits.
The requested audit is now published: P0_MENU_MODE_AND_DEPTH_AUDIT.md and
P0_MENU_MODE_RECONSTRUCTION_CONTRACT.md. Their source findings match current
right-click-v3.js: narrowEntries walks parentId only; roots uses configured
parentId-null shortcuts. history-navigation.js tab() always calls tabs.create;
Explorer already consumes exact receipts and has epoch/abort guards.

Protected tag objects: BASE-v3 322358123d78cebad75ee4503f30c33cfa34459c;
V3-MENU-MODES-BEFORE-HISTORY-REPAIR cff7020054885e95a3f313cacd38f37218f9e735;
V3-BEFORE-NARROW-DEPTH-RECONSTRUCTION 20612eb8f181abfe087be8d28995d983cf4c2e1e
(peels to 10bd512093e44f09d0b60676f89d1688c44b82ff). No tag updates authorized.

Implementation follows owner semantics and published reconstruction contract.
Simple stays unchanged. Narrow derives headings without adding configuration.
Level requires separate explicit bucket consent; credentials alone never opt in.
Original Unknown request cause remains unproven. Source/mock evidence must be
reported separately from installed Chrome and live Cloudflare acceptance.
