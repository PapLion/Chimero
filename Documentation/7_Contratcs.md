# Chimero Tracker Contracts

This is the master index for current tracker/product contracts. It summarizes what is shipped, what is partial, what is removed, and what still needs a dedicated contract.

## Completed / implemented

| Tracker | Status | Current contract state |
| --- | --- | --- |
| Weight | Complete | Specialized Weight foundation is implemented. Uses base entries plus specialized weight data. Surfaces are wired across Quick Entry/Edit/Home/Entries/Stats/Calendar as defined in the Weight contract. |
| Tags | Complete | Tag selection/surface flow is implemented enough for tracker entries and labels/chips on current surfaces. |
| Mood | Complete | Mood is implemented with generic entries plus typed read models. Canonical scale is 1-10. There is no `entry_mood` table. Energy/stress remain deferred. |
| Tasks | Complete | Tasks use generic entries plus typed task metadata/history. Postpone-to-next-day is implemented, including old-day postponed visibility and active-day actionable visibility. Repeated postpone history is supported. Undo/unpostpone remains deferred. |
| TV / Media | Complete | TV and Media are now separate supported tracker identities. They share the generic entry infrastructure. Fresh defaults no longer create merged `Media/TV`. Populated legacy `Media/TV` is preserved non-destructively. No catalog/season/episode/status/progress model is implemented. |
| Gaming | Complete | Structured Gaming entry foundation is implemented. New structured Gaming entries use `gameTitle`, normalized `gameKey`, and `estimatedHours`. Legacy generic Gaming entries remain readable but unstructured. Wins/losses, outcome gating, platform/mode, catalog/entity, Mood correlations, and item-level Timeline are deferred. |
| Books | Complete | Structured Books lifecycle foundation is implemented. Books use a book entity plus reading activity records. Shelves/status, started/read/finished activities, reading streak from explicit read activities, finished counts from structured finish data, and rating as integer tenths are implemented. Rating visibility closeout is done. Pages/progress/author/genre/reviews/catalog/Mood correlations/rereads remain deferred or rejected. |
| Diet / Food / Calories | Complete | Structured Food foundation is implemented on top of the Diet identity. Food entries use `foodName`, normalized `foodKey`, optional positive calories, optional meal type, tags, assets, detail/history/calendar/home surfaces, and legacy generic Diet rows remain readable as unstructured entries. No catalog/ingredients/macros/barcode/meal-plan/nutrition-db/Health correlation model is implemented. |

## Removed from active scope

| Tracker | Status | Current contract state |
| --- | --- | --- |
| Savings / Finance | Removed | Removed from supported product scope. It was not client-confirmed and the semantics were ambiguous. Generic numeric/custom tracker behavior and `$` formatting remain supported. Legacy Savings/Finance rows are not destructively deleted; they fall back to generic numeric behavior if present. Do not treat Savings as active or planned. |

## Partial / needs future deep implementation

| Tracker | Status | Current contract state |
| --- | --- | --- |
| Social / CRM | Partial foundation implemented | Linked Social interaction foundation is implemented for new structured Social entries, with expanded contact CRM fields, persisted reminder/attention settings, profile blocks with move up/down reorder, and frequency sorting from linked interactions. Legacy `contact_interactions.entryId = null` rows remain readable legacy data and are not backfilled. No Mood correlation UI, AI suggestions, OS-level notifications, contact import/sync, unsafe legacy backfill, or draggable/masonry guarantee is implemented. |
| Exercise / Gym | Complete | Structured workout persistence and visible workout surfaces are implemented. New workouts use dedicated workout tables and services, while legacy generic Exercise rows remain readable as unstructured history. No cardio/steps, no estimated 1RM, and no unit mixing. |
| Diet / Food / Calories | Complete | Structured Food logs are implemented on the Diet identity. Legacy generic Diet rows remain readable as unstructured history, but new Food flows should use the structured food contract instead of generic calories-only writes. |

## Requested but missing contracts

| Tracker | Status | Current contract state |
| --- | --- | --- |
| Health / Symptoms | Missing | Client-requested. Create a dedicated contract later. Should support physical/mental symptoms, custom tags, and future correlations with Food/Exercise/Vitamins/Mood/Weight. |
| Vitamins / Medications | Partial | Combined `Vitamins & Medications` foundation is implemented on the shared intake identity. Structured item/item-event rows, item normalization, optional dosage/unit, tags/assets, detail/history/calendar/home surfaces, and legacy generic row readability are implemented. Adherence, schedules, reminders, prescription management, and correlations remain deferred. |
| Sleep | Missing | Client-requested, below core deep systems in priority. Create a dedicated contract later. Likely supports bedtime/wake time, hours, subjective quality, awakenings/bathroom wakes, dreams/nightmares, and weekly trends. |
| Meditation | Missing | Client-requested but low priority. Create a dedicated contract later. Likely supports meditation days, duration, streaks, and small feeling tags. |

## Backburner

| Tracker | Status | Current contract state |
| --- | --- | --- |
| Hydration / Water | Backburner | A contract exists. Client marked Water/Hydration as low priority, so current generic/simple numeric behavior is acceptable unless reprioritized later. |

## Current contract roadmap

1. Social / CRM follow-up for full dedicated read models, structured Edit Entry, Calendar/Home enrichment, and renderer coverage beyond the shipped foundation.
2. Exercise / Gym remains shipped; future work should be tracked only as follow-up surface polish or adjacent tracker requests.
3. Health / Symptoms contract creation.
4. Sleep contract creation.
5. Meditation contract creation.
6. Vitamins / Medications deep follow-up for any future adherence or correlation work.
7. Hydration only if reprioritized.

Why this order:
- Social now has a safe linked-interaction/CRM foundation, but still needs deeper surface read models before it can be called complete. Exercise remains a confirmed deep system.
- Health should exist before deep Food/Vitamins correlations.
- Vitamins / Medications now has a structured combined foundation, but correlation/advice/schedule work remains future.
- Hydration remains backburner.

## Notes for maintainers

- Completed trackers should be described as shipped behavior, not as placeholders.
- Books, Gaming, and TV/Media are no longer generic media-style stand-ins.
- Legacy merged Media/TV wording is historical only and should not describe current supported identity behavior.
- Savings/Finance should remain absent from active tracker planning.
- Do not promote partial or missing trackers to implemented status until their real contracts and surfaces exist.
