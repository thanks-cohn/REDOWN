# Shelf membership and Quick Glance

Shelf → Settings → Membership writes the existing Chrome local
`quickGlancePremiumEnabled` preference. A stored `true` selects Premium and
enables Quick Glance throughout History. Free clears the feature gate by writing
`false`. History reacts to storage changes, and reopening the Shelf reads the
same preference.

The selector is temporary and the local boolean is user-editable. When license
verification is available, remove the selector and its storage writer. Feed the
verified entitlement into History's existing Quick Glance gate and refresh it
when the entitlement changes. A missing verified entitlement selects Free.

A green dot marks a decoded preview from the recorded cloud destination,
including a successful HTTPS read of the public object URL from a verified R2
receipt. A blue dot marks a decoded preview from the recorded original source
URL. The dot carries a tooltip and accessible name. Pending and unavailable
previews have no origin dot. Origin is kept in the current preview session and
is independent of transfer status and verification.

Previews use the current History page and open date groups. The existing
bounded loading window retrieves nearby previews as the user scrolls.
