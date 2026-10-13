# PrepX privacy, retention and public-content policy

Status: **Draft for UGSM approval — not yet an approved policy**  
Policy owner: ____________________  
Effective date: ____________________  
Next review date: ____________________

This document converts the current PrepX behavior into an approval-ready policy. It is an operational baseline, not jurisdiction-specific legal advice. The UGSM data/privacy owner must confirm applicable legal and organizational requirements before Production.

## 1. Purpose and scope

PrepX is used by the Undergraduate Society of Mawanella to administer and publish examination results. This policy covers student/result records, administrator accounts, audit records, public result searches, service logs, rate-limit data and backups in Development, Preview and Production.

## 2. Data handled by PrepX

| Data | Purpose | Publicly displayed? |
| --- | --- | --- |
| Student name and index number | Identify the matching examination record | Yes, only after a successful lookup |
| NIC number | Alternate lookup credential | Never in full; only the approved masked value may be returned |
| School and examination centre | Identify the examination record | Yes, where configured |
| Subject grades | Publish the approved result | Yes |
| Derived overall result | Internal/API result derivation and validation | Not displayed on the public result page or print output |
| Examination name and year | Identify the published examination | Yes |
| Administrator email/session | Authenticate authorized UGSM administrators | No |
| Administrative audit record | Accountability and incident investigation | No |
| HMAC-derived rate-limit fingerprint | Prevent automated enumeration and abuse | No; raw NIC/index/IP values must not be stored in limiter keys |
| Application/provider logs | Reliability, security and incident response | No |

Raw marks, totals, averages, rankings, passwords, tokens, cookies, API keys and internal database details must never be placed in the public result response.

## 3. Approved uses

Data may be used only to:

- prepare, validate, publish, correct and, when authorized, unpublish examination results;
- authenticate and authorize named UGSM administrators;
- investigate security, availability, data-quality and publication incidents;
- prevent excessive result enumeration and protect service availability;
- meet an approved legal or organizational obligation.

Data must not be sold, used for advertising, copied into personal spreadsheets/devices without approval, or reused for an unrelated purpose.

## 4. Public-result privacy controls

- A result is available only for an examination with `PUBLISHED` status.
- Search requires an examination plus one normalized index number or NIC.
- Full NIC values are never displayed or returned publicly.
- Results are held in memory for page navigation and are not persisted in `localStorage` or `sessionStorage`.
- Public responses and result pages use no-store/noindex protections.
- Rate limiting must be enabled and fail closed in Production.
- Public and operational logs must not contain raw NICs, index numbers, IP addresses, cookies, tokens, request bodies or provider credentials.
- Screenshots, tickets and chat messages must use fictional or redacted student data.

## 5. Retention schedule requiring approval

The data owner must enter an approved duration or event in every row. “Indefinite” is not an acceptable default without a recorded legal/organizational basis.

| Record | Approved retention/event | Disposal or review method | Owner approval |
| --- | --- | --- | --- |
| Student identity and examination results | ____________________ | Authorized deletion/anonymization after expiry and backup consideration | ____________________ |
| Administrative audit logs | ____________________ | Retain only for approved accountability/security period, then controlled deletion | ____________________ |
| Supabase Auth accounts | Until access is withdrawn, then ____________________ | Disable/remove account and `admin_profiles` access promptly | ____________________ |
| Vercel application/function logs | ____________________ | Provider retention setting plus documented redaction/review | ____________________ |
| Supabase database/Auth logs | ____________________ | Provider retention setting plus documented access control | ____________________ |
| Upstash rate-limit fingerprints | Configured rate-limit window plus provider expiry verification | Automatic TTL; verify no persistent raw identifiers | ____________________ |
| Database backups/PITR | ____________________ | Provider-managed expiry; deletion must account for recovery copies | ____________________ |
| Preview/staging fictional data | Delete after test cycle or ____________________ | Environment-owner cleanup and verification | ____________________ |
| Incident evidence | ____________________ | Restricted evidence store and approved secure disposal | ____________________ |

Retention changes require the data owner and release owner. Deletion must be recorded without copying the deleted personal data into the audit note.

## 6. Access, correction and deletion

- Production access is limited to named, individually authenticated UGSM personnel with a justified role.
- Shared administrator accounts are prohibited.
- Access is reviewed before every result period and immediately when a person leaves or changes responsibility.
- Result questions and correction requests go to `ugsmaw@gmail.com`.
- The content/data owner verifies the requester and authoritative source before changing a record.
- Published data must be unpublished when necessary to prevent continued exposure of confirmed incorrect or unauthorized information.
- Correction/deletion decisions and administrative changes must have an audit or incident reference.

## 7. Security and incident handling

For suspected unauthorized disclosure, incorrect publication, credential exposure or service compromise:

1. Notify the named incident lead and data/privacy owner.
2. Contain exposure by unpublishing the affected examination or disabling public search under the approved procedure.
3. Preserve only necessary, access-controlled evidence; do not paste personal data or secrets into public tickets.
4. Rotate affected credentials and revoke unauthorized sessions/access.
5. Determine notification obligations with the UGSM data/legal owner.
6. Validate restored service, document decisions and complete a post-incident review.

## 8. Approved public content

The following values are the proposed production baseline and must be checked for every release:

| Content | Approved baseline | Release approval |
| --- | --- | --- |
| Organizer | Undergraduate Society of Mawanella | ____________________ |
| Support email | `ugsmaw@gmail.com` | ____________________ |
| Result heading | Examination result | ____________________ |
| Result notice | Results are official as published. Contact the Undergraduate Society of Mawanella at `ugsmaw@gmail.com` for queries, corrections, or official certified copies. | ____________________ |
| Not found | The supplied details do not match an available result; do not reveal which identifier failed. | ____________________ |
| Not published | Results are not currently published; do not reveal private examination or student data. | ____________________ |
| Maintenance | Results are temporarily unavailable while scheduled maintenance is completed. Please try again later or contact `ugsmaw@gmail.com`. | ____________________ |
| Support escalation | Email `ugsmaw@gmail.com`; the private operational roster defines internal escalation. | ____________________ |

The examination name, year, subject list, publication timing and examination-specific notice must be approved separately for every release.

## 9. Terms decision

Select and approve one option before Production:

- [ ] A separate public Terms page is required and approved at: ____________________
- [ ] A separate Terms page is not required for this release; the reason and approver are recorded here: ____________________

At minimum, users must not automate enumeration, bypass rate limits, misuse another person’s identifiers, or treat the portal as a replacement for any separately required certified record.

## 10. Public privacy-notice decision

Select and approve one option before Production:

- [ ] Publish a dedicated privacy notice using the approved wording/reference: ____________________
- [ ] A dedicated public notice is not required; the legal/organizational basis and approver are: ____________________

If a public notice is required, it must identify the Undergraduate Society of Mawanella, describe the data and purposes above, explain retention/correction contact routes, and provide `ugsmaw@gmail.com` without exposing internal security details.

## 11. Approval record

| Approval | Name | Decision/evidence reference | Date/time |
| --- | --- | --- | --- |
| Data/privacy owner | ____________________ | ____________________ | ____________________ |
| Examination/content owner | ____________________ | ____________________ | ____________________ |
| Technical owner | ____________________ | Technical accuracy reviewed | ____________________ |
| UGSM release approver | ____________________ | Approved / rejected | ____________________ |

This policy becomes approved only after the retention table, Terms decision, privacy-notice decision, public-content approvals and all four approval records are completed.
