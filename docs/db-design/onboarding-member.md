# BuildGym – Member Onboarding Profile DB Design

**Target DB:** PostgreSQL  
**Source file:** `src/screens/auth/OnboardingScreen.js` (single file, 6 inline step renderers)  
**Schema rule:** All columns nullable — all constraints enforced frontend only.

> **Note on source path:** The user spec referenced `src/screens/user/` (6 separate files), but that directory does not exist in the project. All 6 onboarding steps live as inline renderer functions (`renderStep1` … `renderStep6`) inside the single file `src/screens/auth/OnboardingScreen.js`. Field extraction is sourced from there, plus `src/constants/dummyData.js` for option enumerations.

---

## 1. Field Inventory & Flat vs JSONB Decision Table

### Step 1 — Personal Info

| Field | UI Control | Input Type | Single / Multi | Storage | Column / Key | Rationale |
|---|---|---|---|---|---|---|
| First name | TextInput | Free text | Single | **Flat** | `first_name TEXT` | Atomic string; queried/sorted directly |
| Last name | TextInput | Free text | Single | **Flat** | `last_name TEXT` | Same |
| Email | TextInput | Free text (email) | Single | **Flat** | `email TEXT` | Auth field; indexed |
| Date of birth | TextInput | Free text (`DD/MM/YYYY`) | Single | **Flat** | `dob DATE` | Needs range queries (age, eligibility) |
| Phone | Pre-filled from OTP | Numeric | Single | **Flat** | `phone TEXT` | Auth field; indexed |
| Password | TextInput | Secure text | Single | **NOT stored here** | — | Belongs in `auth.users` / `user_profiles`, never in member_profiles |
| Confirm password | TextInput | Secure text | Single | **NOT stored** | — | UI-only validation |

### Step 2 — Health Profile

| Field | UI Control | Input Type | Single / Multi | Storage | Column / Key | Rationale |
|---|---|---|---|---|---|---|
| Fitness level | Card chips (single select) | Enum string | Single | **Flat** | `fitness_level TEXT` | Single fixed value; readable in reports |
| Health conditions | Chips (multi-select, + Custom) | String list | Multi | **JSONB** | `health_conditions` | Variable-length list; includes free-text custom values |
| Has medications | YES/NO toggle | Boolean | Single | **Flat** | `has_medications BOOLEAN` | Simple flag; filterable |
| Medications text | Multiline TextInput | Free text | Single | **Flat** | `medications_text TEXT` | Long prose; no structure needed |
| Dietary preference | Horizontal chips (single select) | Enum string | Single | **Flat** | `dietary_preference TEXT` | Single value; used in cafe/nutrition features |
| Sleep pattern | Radio list (single select) | Enum string | Single | **Flat** | `sleep_pattern TEXT` | Single value; wellness dashboard filter |

### Step 3 — Injury History

| Field | UI Control | Input Type | Single / Multi | Storage | Column / Key | Rationale |
|---|---|---|---|---|---|---|
| Past injuries | Chips (multi-select, + Custom) | String list | Multi | **JSONB** | `past_injuries` | Variable-length; includes custom user entries |
| Injury status per injury | Inline status selector per chip | Key-value map `{injury: status}` | Multi (nested) | **JSONB** | `injury_status_map` | Dynamic map; number of keys varies per member |
| Physiotherapy / rehab | Switch | Boolean | Single | **Flat** | `has_physiotherapy BOOLEAN` | Simple flag |
| Doctor clearance | 3-option chips (Yes / No / Not Applicable) | Enum string | Single | **Flat** | `doctor_clearance TEXT` | Single value; legal compliance read |

### Step 4 — Activity Goals

| Field | UI Control | Input Type | Single / Multi | Storage | Column / Key | Rationale |
|---|---|---|---|---|---|---|
| Fitness goals | Cards (multi-select, + Custom) | ID string list | Multi | **JSONB** | `fitness_goals` | Multi-select with custom option |
| Workout frequency | Horizontal chips (single select) | Enum string (id) | Single | **Flat** | `workout_frequency TEXT` | Single value; trainer scheduling |
| Preferred workout time | Chips (multi-select) | ID string list | Multi | **JSONB** | `preferred_workout_times` | Multi-select time slots |
| Activity interests | Chips (multi-select, + Custom) | ID string list | Multi | **JSONB** | `activity_interests` | Multi-select; drives class recommendations |

### Step 5 — Emergency Contact

| Field | UI Control | Input Type | Single / Multi | Storage | Column / Key | Rationale |
|---|---|---|---|---|---|---|
| EC name | TextInput | Free text | Single | **Flat** | `ec_name TEXT` | Atomic; read in emergencies |
| EC relationship | Bottom-sheet modal dropdown | Enum string | Single | **Flat** | `ec_relationship TEXT` | Single value from fixed list |
| EC phone | TextInput (phone-pad) | Numeric | Single | **Flat** | `ec_phone TEXT` | Atomic; callable from app |
| EC email | TextInput | Free text (email), optional | Single | **Flat** | `ec_email TEXT` | Optional contact field |

### Step 6 — Consent & Preferences

| Field | UI Control | Input Type | Single / Multi | Storage | Column / Key | Rationale |
|---|---|---|---|---|---|---|
| Consent – Terms of Service | Checkbox (mandatory) | Boolean | Single | **Flat** | `consent_terms BOOLEAN` | Legal — must be individually recorded |
| Consent – Privacy Policy | Checkbox (mandatory) | Boolean | Single | **Flat** | `consent_privacy BOOLEAN` | Legal — individually recorded |
| Consent – Medical fitness | Checkbox (mandatory) | Boolean | Single | **Flat** | `consent_medical_fitness BOOLEAN` | Legal — individually recorded |
| Opt-in – Leaderboard | Checkbox (optional) | Boolean | Single | **Flat** | `opt_leaderboard BOOLEAN` | Simple flag; privacy preference |
| Opt-in – Community | Checkbox (optional) | Boolean | Single | **Flat** | `opt_community BOOLEAN` | Simple flag; feature toggle |
| Opt-in – Promotions | Checkbox (optional) | Boolean | Single | **Flat** | `opt_promotions BOOLEAN` | Simple flag; marketing preference |

---

## 2. PostgreSQL `CREATE TABLE` — `member_profiles`

```sql
-- ============================================================
-- BuildGym – member_profiles
-- One row per gym member, created at end of onboarding flow.
-- References auth/user record held in user_profiles(id).
-- ALL columns are nullable; constraints are frontend-enforced.
-- ============================================================

CREATE TABLE member_profiles (

  -- ── Identity ───────────────────────────────────────────────
  id                      UUID          DEFAULT gen_random_uuid(),
  user_profile_id         UUID,                               -- FK → user_profiles(id)

  -- ── Step 1 · Personal Info ─────────────────────────────────
  first_name              TEXT,
  last_name               TEXT,
  email                   TEXT,
  phone                   TEXT,                               -- pre-filled from OTP; +91 prefix stripped
  dob                     DATE,                               -- stored as ISO date (DD/MM/YYYY parsed frontend)
  profile_photo_url       TEXT,                               -- CDN / bucket URL for avatar

  -- ── Step 2 · Health Profile ────────────────────────────────
  fitness_level           TEXT,                               -- 'beginner' | 'intermediate' | 'advanced' | 'athlete'
  health_conditions       JSONB,                              -- string[] — see §3 for example
  has_medications         BOOLEAN,
  medications_text        TEXT,                               -- free prose; only meaningful when has_medications = true
  dietary_preference      TEXT,                               -- 'No Preference' | 'Vegetarian' | 'Vegan' | 'Keto' | 'Gluten-Free'
  sleep_pattern           TEXT,                               -- 'Less than 5 hrs' | '6–7 hrs' | '7–8 hrs' | '8+ hrs'

  -- ── Step 3 · Injury History ────────────────────────────────
  past_injuries           JSONB,                              -- string[] — see §3 for example
  injury_status_map       JSONB,                              -- {injury_label: status_string} — see §3
  has_physiotherapy       BOOLEAN,
  doctor_clearance        TEXT,                               -- 'Yes' | 'No' | 'Not Applicable'

  -- ── Step 4 · Activity Goals ────────────────────────────────
  fitness_goals           JSONB,                              -- string[] of goal ids — see §3
  workout_frequency       TEXT,                               -- '1-2' | '3-4' | '5-6' | 'daily'
  preferred_workout_times JSONB,                              -- string[] of time-slot ids — see §3
  activity_interests      JSONB,                              -- string[] of activity ids — see §3

  -- ── Step 5 · Emergency Contact ────────────────────────────
  ec_name                 TEXT,
  ec_relationship         TEXT,                               -- 'Spouse' | 'Parent' | 'Sibling' | 'Friend' | 'Child' | 'Other'
  ec_phone                TEXT,                               -- 10-digit local; +91 prefix assumed
  ec_email                TEXT,

  -- ── Step 6 · Consent & Preferences ────────────────────────
  consent_terms           BOOLEAN,                            -- mandatory; true required before submit
  consent_privacy         BOOLEAN,                            -- mandatory
  consent_medical_fitness BOOLEAN,                            -- mandatory (medical fitness declaration)
  opt_leaderboard         BOOLEAN,                            -- optional preference
  opt_community           BOOLEAN,                            -- optional preference
  opt_promotions          BOOLEAN,                            -- optional preference

  -- ── Meta ───────────────────────────────────────────────────
  onboarding_completed    BOOLEAN      DEFAULT FALSE,
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW(),

  PRIMARY KEY (id)
);

-- ── Foreign key ─────────────────────────────────────────────
ALTER TABLE member_profiles
  ADD CONSTRAINT fk_member_profiles_user_profile
  FOREIGN KEY (user_profile_id)
  REFERENCES user_profiles (id)
  ON DELETE CASCADE;

-- ── Indexes (common query patterns) ─────────────────────────
CREATE INDEX idx_member_profiles_user_profile_id  ON member_profiles (user_profile_id);
CREATE INDEX idx_member_profiles_email            ON member_profiles (email);
CREATE INDEX idx_member_profiles_phone            ON member_profiles (phone);
CREATE INDEX idx_member_profiles_fitness_level    ON member_profiles (fitness_level);
CREATE INDEX idx_member_profiles_onboarding       ON member_profiles (onboarding_completed);

-- GIN indexes for JSONB containment queries
CREATE INDEX idx_gin_health_conditions       ON member_profiles USING GIN (health_conditions);
CREATE INDEX idx_gin_fitness_goals           ON member_profiles USING GIN (fitness_goals);
CREATE INDEX idx_gin_activity_interests      ON member_profiles USING GIN (activity_interests);
CREATE INDEX idx_gin_preferred_workout_times ON member_profiles USING GIN (preferred_workout_times);
CREATE INDEX idx_gin_past_injuries           ON member_profiles USING GIN (past_injuries);

-- ── Auto-update updated_at trigger ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_member_profiles_updated_at
  BEFORE UPDATE ON member_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 3. Example JSONB Payloads

### `health_conditions` — `JSONB` (string array)

Standard selections only:
```json
["Hypertension", "Lower Back Pain"]
```

With custom entry added by user:
```json
["Diabetes (Type 1)", "Asthma", "Thyroid (custom)"]
```

"None" selected (no conditions):
```json
["None"]
```

---

### `past_injuries` — `JSONB` (string array)

Standard selections:
```json
["Knee Injury", "Shoulder Injury", "Ankle Sprain"]
```

With custom text entry:
```json
["Lower Back Injury", "Torn ACL (custom)"]
```

No injuries reported:
```json
["None"]
```

---

### `injury_status_map` — `JSONB` (object: injury label → status string)

The keys are exactly the injury labels from `past_injuries` (excluding "None" and "+ Custom").  
Values are one of: `"Fully Recovered"`, `"Recovering"`, `"Chronic / Ongoing"`.

```json
{
  "Knee Injury": "Recovering",
  "Shoulder Injury": "Fully Recovered",
  "Ankle Sprain": "Chronic / Ongoing"
}
```

Single injury:
```json
{
  "Lower Back Injury": "Fully Recovered"
}
```

Empty (no injuries selected, or only "None" chosen):
```json
{}
```

---

### `fitness_goals` — `JSONB` (string array of goal IDs)

```json
["weight_loss", "stamina", "stress_relief"]
```

With custom goal (custom goal text stored as plain string):
```json
["muscle_gain", "posture", "Run a 10k marathon (custom)"]
```

Single goal:
```json
["flexibility"]
```

---

### `preferred_workout_times` — `JSONB` (string array of time-slot IDs)

```json
["early_morning", "evening"]
```

Single slot:
```json
["morning"]
```

All slots selected:
```json
["early_morning", "morning", "afternoon", "evening", "night"]
```

---

### `activity_interests` — `JSONB` (string array of activity IDs)

```json
["weights", "cardio", "hiit"]
```

With custom activity:
```json
["yoga", "sauna", "Calisthenics (custom)"]
```

---

## 4. Notes on Ambiguous Fields

### `password` / `confirm_password` (Step 1)
Not stored in `member_profiles`. These belong in the authentication layer (`auth.users`, Supabase auth, or equivalent). The mobile number pre-filled from OTP is the primary auth identifier.

### `health_conditions` — `"+ Custom"` option
The UI chip labelled `"+ Custom"` acts as a trigger to open a free-text input (implied by pattern; the current implementation toggles it as a chip). When stored, the user's custom string should replace the `"+ Custom"` chip value before writing to the DB, e.g. `"Thyroid (custom)"`. The same pattern applies to `past_injuries` and `activity_interests`.

### `injury_status_map` keys
The JSONB object keys are the **exact display strings** from `PAST_INJURIES` (e.g. `"Knee Injury"`), not IDs. This is intentional: the keys must match what the frontend renders to re-populate the per-injury status selector on edit. If the injury list is later normalized into its own table, this map should migrate to a separate `member_injury_statuses` child table.

### `dob` column type
The UI accepts `DD / MM / YYYY` free text. The frontend is responsible for parsing and reformatting to ISO `YYYY-MM-DD` before inserting. The column is typed `DATE` (not `TEXT`) to enable age-based queries (e.g. minor member verification, birthday notifications).

### `fitness_level` flat column (Step 2)
Although this uses a card-chip UI, it is stored flat (`TEXT`) because:
- It is always a single value
- It is a first-class filter for trainer assignment queries (`WHERE fitness_level = 'beginner'`)
- Wrapping it in JSONB would add overhead with zero benefit

### `workout_frequency` flat column (Step 4)
Same rationale as `fitness_level` — always single-select, used as a scheduling filter.

### `ec_phone` format
Stored as plain `TEXT` (10 digits, no prefix). The `+91` prefix is fixed in the UI and does not need to be stored. Reconstruct full international number as `'+91' || ec_phone` in application code when dialling.

### `profile_photo_url`
Not collected during onboarding (no file-upload field exists in the 6 steps). Column is included in the table as it is a standard member profile field expected to be set post-onboarding from the Profile screen (`src/screens/profile/ProfileScreen.js`). No file-upload handling is needed in the onboarding insert path.

### Consent timestamps
The UI footer states: *"Consent timestamps are recorded for legal compliance."* The `created_at` column covers initial consent time (recorded when `onboarding_completed` flips to `TRUE`). If individual consent-change timestamps are required for audit (e.g. GDPR), add separate `consent_terms_at TIMESTAMPTZ`, `consent_privacy_at TIMESTAMPTZ`, `consent_medical_fitness_at TIMESTAMPTZ` columns.

### `onboarding_completed` flag
Set to `TRUE` only when Step 6 is submitted with all three mandatory consents (`consent_terms`, `consent_privacy`, `consent_medical_fitness`) checked and the "GET STARTED" CTA fires. Intermediate step data can be persisted with `onboarding_completed = FALSE` to support resume-from-last-step flows.
