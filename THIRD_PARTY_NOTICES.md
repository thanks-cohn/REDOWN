# Notices and provenance

REDOWN Basic is an independently configured extraction of the three-provider saving mechanisms in [thanks-cohn/REDOWN](https://github.com/thanks-cohn/REDOWN), inspected at commit `c78babc314acc5891203e95b169f027756e956c1`. Extraction was requested by the repository owner for this implementation. That request does not grant a public license or permission to publish a store package.

The original REDOWN copyright notice and Proprietary Source License 2.1 are preserved verbatim in [LICENSE](LICENSE). Copyright (c) 2026 the respective REDOWN copyright holders. All rights reserved. No original application assets, OAuth credentials, cached tokens or extension identity are copied. See [the extraction map](docs/EXTRACTION.md).

The runtime ZIP implementation is `fflate` 0.8.2 by Arjun Barrett, distributed under the MIT license. Its unmodified browser module is vendored at `extension/vendor/fflate.js` and its license at `extension/vendor/fflate.LICENSE`.

Development-only dependencies (`fake-indexeddb` and `jsdom`, plus their transitives) retain their individual package licenses. Their installation does not change REDOWN's license. No REDOWN service, Worker, helper, or original extension is a runtime dependency.
