# Duplicates, aliases and branch instances: executable casebook

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## Five identities, current versus proposed

Real current destination identity is `(cloudflare-r2, profileId, accountId, bucketName, exact prefix)`. Profile is not a general S3 connection; endpoint/credentials live privately on that profile. Shortcut identity is `destination.id`; action IDs are `v3:<id>` and selected branch `v3:<id>:send`. Synthetic Narrow navigation identity is `v3:path:` plus URI-encoded JSON `[profileId,accountId,bucketName,prefix]`; Depth uses `v3:cloud:` plus the same tuple. Text labels never resolve cloud targets. Current domain: [extension/right-click-v3.js:7–70](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-v3.js#L7-L70) and [extension/right-click-v3.js:251–270](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-v3.js#L251-L270).

A current checkmark is the enabled flag of one saved record; discovered folder rows have a + control, not a checkmark that instantly approves the folder. Multiple alias records can be created through repeated Add submissions with fresh IDs. Current schema has no branch-presentation-instance identity or independent per-mode selection. A visible navigation ancestor is not automatically a save target in Narrow; Depth deliberately exposes discovered authorized folder actions according to participating scopes.

IF two selected records share a path but have different IDs, THEN validation allows both. IF their IDs collide, THEN validation rejects. IF their paths share ancestry, THEN Narrow merges navigation but retains alias actions. IF the owner explicitly wants two named whole branches, THEN a new presentation-instance concept is required; adding an ordinary alias must not clone a branch.

## Exhaustive current executable examples

All records, checkmarks, descriptors and exact routes below come from the actual current domain, not a proposed rewrite. Synthetic profiles are p/a/bucket, q/b/bucket and home/a/redown; worker/token values are fixture-only and excluded from route tables. `Home` can appear because a prepared redown profile exists. Full machine inputs and every descriptor/route are in [observations.json](evidence/observations.json); rerun [reproduce.mjs](evidence/reproduce.mjs) from repository root. All menu trees explicitly mark navigation versus save. No cloud folders were created.

### 01-common-last

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "w",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Weddings",
      "label": "w",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "p",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Portraits",
      "label": "p",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  w [SAVE] v3:w
  p [SAVE] v3:p
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:w` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Weddings"]`
- `v3:p` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Art [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%22%5D
      Photography [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%22%5D
        w [SAVE] v3:w
        p [SAVE] v3:p
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:w` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Weddings"]`
- `v3:p` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** Shared Art/Photography is one navigation chain; Weddings and Portraits remain exact leaves.

**V3+1 desired / failure and acceptance:** Keep natural coalescing; test each click saves once to its corresponding prefix.

### 02-diverge-two

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "j",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Clients/John",
      "label": "j",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "f",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Personal/Family",
      "label": "f",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  j [SAVE] v3:j
  f [SAVE] v3:f
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:j` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Clients/John"]`
- `v3:f` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Personal/Family"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Art [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%22%5D
      Photography [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%22%5D
        Clients [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%2FClients%22%5D
          j [SAVE] v3:j
        Personal [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%2FPersonal%22%5D
          f [SAVE] v3:f
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:j` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Clients/John"]`
- `v3:f` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Personal/Family"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** The trie branches at Clients versus Personal, not by display label or parentId.

**V3+1 desired / failure and acceptance:** Keep segment-based branching; assert John and Family do not cross-route.

### 03-parent-selected

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "a",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "a",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "b",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography",
      "label": "Photography",
      "parentId": "a",
      "enabled": true
    },
    {
      "id": "c",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Portraits",
      "label": "Portraits",
      "parentId": "b",
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  a [SAVE] v3:a
  Photography [SAVE] v3:b
  Portraits [SAVE] v3:c
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:a` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:b` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    a [NAV ONLY] v3:a
      Save here [SAVE HERE] v3:a:send
      Photography [NAV ONLY] v3:b
        Save here [SAVE HERE] v3:b:send
        Portraits [SAVE] v3:c
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:a:send` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:b:send` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** Art and Photography are selected branch records. Each has an explicit :send child; Portraits is a leaf.

**V3+1 desired / failure and acceptance:** Keep Save here; assert clicking the branch itself resolves null, each :send resolves only its prefix.

### 04-two-aliases

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "c",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Portraits",
      "label": "Client Photography",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "m",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Portraits",
      "label": "My Portraits",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  Client Photography [SAVE] v3:c
  My Portraits [SAVE] v3:m
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:m` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Art [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%22%5D
      Photography [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%22%5D
        Portraits [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%2FPortraits%22%5D
          Client Photography [SAVE] v3:c
          My Portraits [SAVE] v3:m
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:m` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** The exact path is one synthetic branch containing both differently named alias actions.

**V3+1 desired / failure and acceptance:** Keep separate shortcut IDs and single dispatch. Add contextual alias affordance instead of requiring manual duplicate forms.

### 05-identical-label

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "c",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Portraits",
      "label": "Photos",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "m",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Portraits",
      "label": "Photos",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  Photos [SAVE] v3:c
  Photos · 2 [SAVE] v3:m
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:m` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Art [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%22%5D
      Photography [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%22%5D
        Portraits [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%2FPortraits%22%5D
          Photos [SAVE] v3:c
          Photos [SAVE] v3:m
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:m` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** Simple suffixes the duplicate title. Narrow retains two identical visible labels with distinct action IDs. Validation does not warn.

**V3+1 desired / failure and acceptance:** Warn without silent merge; show contextual account/path or ordinal while preserving entered label; test ID uniqueness.

### 06-alias-children

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "c",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography",
      "label": "Client Photography",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "m",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography",
      "label": "My Photos",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "kid",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography/Portraits",
      "label": "Portraits",
      "parentId": "c",
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  Client Photography [SAVE] v3:c
  My Photos [SAVE] v3:m
  Portraits [SAVE] v3:kid
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:m` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:kid` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Art [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%22%5D
      Photography [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%22%5D
        Client Photography [SAVE] v3:c
        My Photos [SAVE] v3:m
        Portraits [SAVE] v3:kid
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:c` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:m` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:kid` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography/Portraits"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** The shared path holds two alias save leaves and a descendant. It does not get a synthetic Save here route of its own.

**V3+1 desired / failure and acceptance:** Keep navigation and action identities distinct; explicit alias actions plus descendants must remain reachable.

### 07-alternate-branch-attempt

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "first",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "Work",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "second",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "Personal",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "one",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography",
      "label": "Work photos",
      "parentId": "first",
      "enabled": true
    },
    {
      "id": "two",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography",
      "label": "Personal photos",
      "parentId": "second",
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  Work [SAVE] v3:first
  Personal [SAVE] v3:second
  Work photos [SAVE] v3:one
  Personal photos [SAVE] v3:two
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:first` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:second` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:one` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:two` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Art [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%22%5D
      Work [SAVE] v3:first
      Personal [SAVE] v3:second
      Photography [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%2FPhotography%22%5D
        Work photos [SAVE] v3:one
        Personal photos [SAVE] v3:two
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:first` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:second` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:one` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:two` → `["cloudflare-r2", "p", "a", "bucket", "Art/Photography"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** Even two explicit parent chains into the same path coalesce into one native ancestry. parentId cannot force a full alternate branch instance.

**V3+1 desired / failure and acceptance:** NEW branchInstanceId/presentation parent contract needed only for intentional alternate branches. Test two branch IDs, same real targets, no doubled saves.

### 08-same-label-scopes

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "one",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "Photos",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "two",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Other",
      "label": "Photos",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "q",
      "profileId": "q",
      "accountId": "b",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "Photos",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  Photos · a [SAVE] v3:one
  Photos · a · 2 [SAVE] v3:two
  Photos · b [SAVE] v3:q
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:one` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:two` → `["cloudflare-r2", "p", "a", "bucket", "Other"]`
- `v3:q` → `["cloudflare-r2", "q", "b", "bucket", "Art"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket · a · p [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Photos [SAVE] v3:one
    Photos [SAVE] v3:two
  bucket · b · q [NAV ONLY] v3:path:%5B%22q%22%2C%22b%22%2C%22bucket%22%2C%22%22%5D
    Photos [SAVE] v3:q
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:one` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:two` → `["cloudflare-r2", "p", "a", "bucket", "Other"]`
- `v3:q` → `["cloudflare-r2", "q", "b", "bucket", "Art"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** Two different prefixes with the same label are distinct actions. A matching bucket name in another account/profile is another Narrow group; root titles include account/profile disambiguation.

**V3+1 desired / failure and acceptance:** Keep tuple isolation. Multiple S3 endpoints cannot be represented by current prepared Cloudflare-only model; fictional adapter proof remains future work.

### 09-prefix-case-unicode

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "x",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "x",
      "label": "x",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "xx",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "x-extra",
      "label": "xx",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "up",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "X",
      "label": "up",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "u",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "写真/é",
      "label": "u",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "u2",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "写真/é",
      "label": "u2",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  x [SAVE] v3:x
  xx [SAVE] v3:xx
  up [SAVE] v3:up
  u [SAVE] v3:u
  u2 [SAVE] v3:u2
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:x` → `["cloudflare-r2", "p", "a", "bucket", "x"]`
- `v3:xx` → `["cloudflare-r2", "p", "a", "bucket", "x-extra"]`
- `v3:up` → `["cloudflare-r2", "p", "a", "bucket", "X"]`
- `v3:u` → `["cloudflare-r2", "p", "a", "bucket", "写真/é"]`
- `v3:u2` → `["cloudflare-r2", "p", "a", "bucket", "写真/é"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    x [SAVE] v3:x
    xx [SAVE] v3:xx
    up [SAVE] v3:up
    写真 [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%E5%86%99%E7%9C%9F%22%5D
      u [SAVE] v3:u
      u2 [SAVE] v3:u2
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:x` → `["cloudflare-r2", "p", "a", "bucket", "x"]`
- `v3:xx` → `["cloudflare-r2", "p", "a", "bucket", "x-extra"]`
- `v3:up` → `["cloudflare-r2", "p", "a", "bucket", "X"]`
- `v3:u` → `["cloudflare-r2", "p", "a", "bucket", "写真/é"]`
- `v3:u2` → `["cloudflare-r2", "p", "a", "bucket", "写真/é"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** x and x-extra are separate exact trie children. X differs from x. Composed é and decomposed é remain distinct strings; no Unicode normalization.

**V3+1 desired / failure and acceptance:** Keep exact bytes and slash boundaries. Test Worker exactIngestPaths for non-ASCII and spaces; labels must never normalize routing.

### 10-disabled

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "parent",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "Art",
      "parentId": null,
      "enabled": false
    },
    {
      "id": "child",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Photography",
      "label": "Photography",
      "parentId": "parent",
      "enabled": true
    },
    {
      "id": "independent",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art/Independent",
      "label": "independent",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  independent [SAVE] v3:independent
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:independent` → `["cloudflare-r2", "p", "a", "bucket", "Art/Independent"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Art [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22Art%22%5D
      independent [SAVE] v3:independent
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:independent` → `["cloudflare-r2", "p", "a", "bucket", "Art/Independent"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** Explicit disabled parent blocks linked child. Independently selected Art/Independent with parentId null survives.

**V3+1 desired / failure and acceptance:** Make this policy visible before migration; preserve behavior or obtain owner decision to decouple approval from outline ancestry.

### 10-invalid-path

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "bad",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "x/../z",
      "label": "bad",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

Validation result: `Use an exact folder path without empty or dot segments (maximum 900 UTF-8 bytes).`. No valid current plan/routes for this input.

**Nested/Narrow actual:**

Validation result: `Use an exact folder path without empty or dot segments (maximum 900 UTF-8 bytes).`. No valid current plan/routes for this input.

**Meaning / current limitation:** Validation rejects dot segments before native projection.

**V3+1 desired / failure and acceptance:** Keep fail-closed validation. Do not reinterpret invalid paths as root.

### 10-duplicate-id

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "dup",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "x",
      "label": "dup",
      "parentId": null,
      "enabled": true
    },
    {
      "id": "dup",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "y",
      "label": "dup",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

Validation result: `Invalid or duplicate destination ID.`. No valid current plan/routes for this input.

**Nested/Narrow actual:**

Validation result: `Invalid or duplicate destination ID.`. No valid current plan/routes for this input.

**Meaning / current limitation:** Duplicate record ID rejects the whole configuration; duplicate labels/paths are a different issue.

**V3+1 desired / failure and acceptance:** Keep unique ID invariant; provide recovery without destroying independent provider contributions.

### 10-revoked

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "one",
      "profileId": "p",
      "accountId": "missing",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "Art",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

Validation result: `Activate this account and bucket in Explorer before saving.`. No valid current plan/routes for this input.

**Nested/Narrow actual:**

Validation result: `Activate this account and bucket in Explorer before saving.`. No valid current plan/routes for this input.

**Meaning / current limitation:** No matching prepared profile rejects explicit validation. project filters unprepared records before validating; current routes cannot resurrect this target.

**V3+1 desired / failure and acceptance:** Keep fail-closed route; retain unavailable configuration for repair rather than infer remote deletion.

### 11-shared-modes

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "shared",
      "profileId": "p",
      "accountId": "a",
      "bucketName": "bucket",
      "prefix": "Art",
      "label": "Shared alias",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  Shared alias [SAVE] v3:shared
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:shared` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  bucket [NAV ONLY] v3:path:%5B%22p%22%2C%22a%22%2C%22bucket%22%2C%22%22%5D
    Shared alias [SAVE] v3:shared
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:shared` → `["cloudflare-r2", "p", "a", "bucket", "Art"]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** One stored label and enabled flag supplies both projections; independent labels/order cannot be serialized today.

**V3+1 desired / failure and acceptance:** NEW separate per-mode alias selection/presentation state; migrate existing record to both initial states without cloud changes.

### 12-root-alias

Picked/checked current records (this is the actual serialized version-1 input):

```json
{
  "version": 1,
  "revision": 0,
  "destinations": [
    {
      "id": "root",
      "profileId": "home",
      "accountId": "a",
      "bucketName": "redown",
      "prefix": "",
      "label": "Independently named root",
      "parentId": null,
      "enabled": true
    }
  ]
}
```

**Simple actual:**

```text
Cloudflare [SAVE] v3:provider:cloudflare
```

Exact action → canonical tuple:

- `v3:provider:cloudflare` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Nested/Narrow actual:**

```text
Cloudflare [NAV ONLY] v3:provider:cloudflare
  redown [NAV ONLY] v3:path:%5B%22home%22%2C%22a%22%2C%22redown%22%2C%22%22%5D
    Independently named root [SAVE] v3:root
  ──────── [SEPARATOR] v3:provider:cloudflare:separator
  Home [SAVE] v3:provider:cloudflare:default
```

Exact action → canonical tuple:

- `v3:root` → `["cloudflare-r2", "home", "a", "redown", ""]`
- `v3:provider:cloudflare:default` → `["cloudflare-r2", "home", "a", "redown", ""]`

**Meaning / current limitation:** The default redown-root alias is filtered out of Simple extras; Narrow still exposes the named root alias under the bucket path.

**V3+1 desired / failure and acceptance:** Owner should settle whether explicit named default-root aliases override suppression. Recommended preserve explicit aliases; Home stays a separate exact default action.

## Required edge cases beyond one projection snapshot

A deleted or stale ID resolves null because resolve checks membership in the CURRENT plan before looking up the record. A valid :send ID is not accepted if no longer emitted. Removed connection/unprepared profile cannot be used as an implicit default. `remove` cascades through explicit parentId links, while the natural trie may still show that real prefix for other independent records. The fixture records stale `v3:deleted` resolution for every valid scenario. Expired real authorization can still pass the structural prepared-profile check; provider rejection is a later boundary and remains live-unverified.

Ordering is not label sorting: Simple manual aliases follow record array order, and Narrow traversal follows first path insertion. Reordering one alias may therefore change which shared path is encountered first. Changing Depth never rewrites shared aliases. Two concurrent native clicks are two requests; separate alias IDs do not implement cross-click exactly-once idempotency. No fixture here proves deduplication after uncertain upload completion.

Default `v3:provider:cloudflare` (only when leaf) and `v3:provider:cloudflare:default` resolve the chosen lowercase redown root. `redown-go-home` is explicitly handled as REDOWN dashboard navigation, not a save. The audit's root alias case demonstrates current Simple suppression instead of silently promising all aliases survive.

## Proposed alias UI and alternate branches

Show a checked cloud folder once in the picker. Beside its menu name, a small contextual “Add another menu entry” action adds another alias row with editable name, enable toggle and reorder affordance. Existing aliases appear as a compact list under that folder, with location path read-only. The first check creates the first alias; subsequent aliases use the contextual action. A checkmark alone cannot express multiplicity. Renaming a menu entry never creates or renames a remote folder.

Automatic ancestry coalescing is appropriate for ordinary Narrow navigation, even with several aliases at one prefix. An advanced “Add alternate branch” action, shown only on intentional request, creates a separate branch-instance ID and display-parent relation. Its descendants refer to existing real location IDs; navigation is never a writable authorization identity. Two full branch instances may share real locations without sharing presentation labels. V3+1 projected trees should otherwise match the actual good trees above; explicit alternate branches, independent per-mode edits, root-alias preservation and duplicate ambiguity warnings are NEW proposed behavior.

## Explicit desired projection differences — proposal only

For cases01/02/03/04/06/08/09, preserve the current good tree shapes above with mode-specific alias records. In case05, retain both actions and add a duplicate-name warning in Setup; contextual suffixes may distinguish native labels without changing target identity. Invalid cases10 must fail validation/reject stale routes, never route to a fallback. Case11 should serialize two separate alias configurations referencing one location, rather than placing the mode label on that location.

Case07 intentionally named full branches, NEW desired Narrow:

```text
Cloudflare [NAV ONLY]
  Work [NAV ONLY branch:work]
    Art [NAV ONLY]
      Work photos [SAVE action:work-photos → (S3,connection:a,bucket,Art/Photography)]
  Personal [NAV ONLY branch:personal]
    Art [NAV ONLY]
      Personal photos [SAVE action:personal-photos → (S3,connection:a,bucket,Art/Photography)]
```

This example's exact visual nesting is an owner decision; the required difference is two distinct presentation branch IDs with the same underlying exact location, not two cloud paths. An ordinary second alias still produces the coalesced path with two save leaves, as actual case04 shows.

Case11 desired independent state:

```json
{"locationId":"loc-a-art","simple":{"aliases":[{"id":"s1","label":"Quick work","enabled":true,"order":1}]},"narrow":{"aliases":[{"id":"n1","label":"Art archive","enabled":false,"order":4}]}}
```

Proposed Simple emits Quick work [SAVE] while Narrow emits no action for disabled n1. Enabling n1 later emits Art archive at natural Art ancestry. Both resolve the same connection/container/exact-prefix tuple. The new schema example is illustrative, not a current accepted storage format.

Case12 recommended desired Simple when explicit root alias exists:

```text
Cloudflare [NAV ONLY]
  Independently named root [SAVE alias:root → (connection:a,redown,"")]
  separator
  Home [SAVE default → (connection:a,redown,"")]
```

Unlike current Simple, the explicit alias remains separately selectable. One click still invokes one save. The owner must approve this intentional difference; REDOWN Go Home remains a separate navigation control.
