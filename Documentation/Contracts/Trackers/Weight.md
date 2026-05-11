# Weight Tracker Contract

Weight is the reference specialized tracker after milestone `a02899f`.

## Input

`CreateWeightEntryRequest` supports:

- `trackerId`
- `weight`
- `weightUnit`: `kg` or `lb`
- optional `waist`
- optional `waistUnit`: `cm` or `in`
- optional `bodyFatPercentage` as future/optional product data
- optional `note`
- `timestamp`
- optional `assetId`
- optional `tagIds`

## Persistence

Weight writes both generic and specialized data:

- `entries`: generic value, note, metadata, asset, timestamp, and `dateStr`.
- `entry_weight`: exact weight, unit, waist, waist unit, and optional body fat.
- `entries_to_tags`: replaced when `tagIds` are provided.
- `tracker_goals`: read/written through goal endpoints, not as part of Quick Entry.

## Backend / Computed Output

`get-weight-detail` returns `WeightDetailResponse`:

- `current`
- `history`
- `chartData`
- `deltaPrevious`
- `deltaWeek`
- `weeklyAvg`
- `activeGoal`
- `distanceToGoal`
- `goalAchieved`
- `streakDays`

Shared domain helpers build Weight read models for:

- Home widget summary
- Entries tab history
- Statistics tab metrics

## Current Surfaces

- Quick Entry creates specialized Weight entries.
- Weight widget can show current weight, trend, delta, sparkline, and optional waist.
- Tracker detail can show Weight history and Weight statistics.
- Edit entry supports Weight value/unit, waist/unit, note, timestamp, asset, and tags when provided to the contract.
- Calendar month data is enriched with Weight fields when `entry_weight` exists.

## Known Gaps

- Tags persist through the contract, but visible tag picker/chip UI remains pending.
- Dedicated Weight goal editing UI remains pending.
- Body fat exists in persistence/service contracts but is not a required product surface.
- Calendar selected-day UI still needs resolved tag labels and richer asset presentation.
