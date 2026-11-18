# Firestore Security Specification

## 1. Data Invariants
1. Every document under `/users/{userId}` belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. Every observation under `/users/{userId}/observations/{observationId}` must embed `uid == request.auth.uid` and `createdAt == request.time`, ensuring zero orphaned or spoofed documents.
3. No unauthenticated or cross-user reads (`get` or `list`) are allowed on user profiles or observations.
4. All IDs (`userId`, `observationId`, `preferredCityId`) must match `^[a-zA-Z0-9_\-]+$` and stay within `<= 128` characters.

## 2. Adversarial "Dirty Dozen" Payloads Blocked by Rules
1. Unauthenticated read/write to `/users/u1` -> `PERMISSION_DENIED`.
2. Authenticated read to `/users/otherUser` -> `PERMISSION_DENIED`.
3. Create with unverified email (`email_verified: false`) -> `PERMISSION_DENIED`.
4. Create `/users/u1` with mismatched `uid: "u2"` -> `PERMISSION_DENIED`.
5. Shadow field injection (`isAdmin: true` or `role: "admin"`) -> blocked by `keys().hasOnly(...)`.
6. Oversized `placeName` (> 140 chars) or `notes` (> 280 chars) -> blocked by `.size()` bounds.
7. Oversized or poisoned document ID (`userId` > 128 chars or containing `/../`) -> blocked by `isValidId()`.
8. Client-forged `createdAt` timestamp not equal to `request.time` -> blocked by temporal integrity rule.
9. Immutable `uid` or `createdAt` mutation during `update` -> blocked by action/immutable check.
10. Cross-user `list` query on `/users/otherUser/observations` -> blocked by `isOwner(userId) && resource.data.uid == request.auth.uid`.
11. Invalid `kind` enum (`kind: "arbitrary_script"`) on observation -> blocked by `in ['green_zone', 'sensor_station', 'neighborhood']`.
12. Negative/non-numeric AQI or PM2.5 injection -> blocked by `is number && >= 0 && <= 2000`.
