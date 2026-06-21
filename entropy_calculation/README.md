# KeePassXC Entropy Calculation

This directory bundles the entropy-estimation code used by KeePassXC's password generator window. It was extracted from the KeePassXC source tree for reuse in other projects.

KeePassXC uses **two independent entropy paths**, depending on whether you are estimating a random character password or a Diceware-style passphrase.

## Directory layout

```
entropy_calculation/
├── README.md
├── zxcvbn/                        # Pure C algorithm + embedded dictionary
│   ├── zxcvbn.c
│   ├── zxcvbn.h
│   ├── dict-src.h                 # ~4.1 MB embedded ranked-word dictionary trie
│   └── CMakeLists.txt
├── core/                          # KeePassXC wrappers (require Qt)
│   ├── PasswordHealth.h
│   ├── PasswordHealth.cpp
│   ├── PassphraseGenerator.h
│   └── PassphraseGenerator.cpp
└── wordlists/
    └── eff_large.wordlist         # EFF large wordlist (7776 words)
```

---

## Overview

| Mode | Entry point | Method |
|------|-------------|--------|
| Character password | `PasswordHealth(const QString&)` | zxcvbn min-entropy search |
| Passphrase / Diceware | `PassphraseGenerator::estimateEntropy()` | Closed-form `wordCount * log2(N)` |

Both paths return entropy in **bits** and map to the same quality thresholds via `PasswordHealth::quality()`.

---

## The math

### Passphrase / Diceware entropy

Each word is chosen uniformly and independently at random from a wordlist of size `N`. The entropy is:

```
H = w * log2(N)
```

Where:
- `w` = number of words (default: 7)
- `N` = number of unique words in the loaded wordlist

For the default EFF large wordlist (`eff_large.wordlist`), `N = 7776 = 6^5`:

```
H = 7 * log2(7776) = 7 * 12.925... ≈ 90.47 bits
```

**Not counted in this estimate:** separator characters, word casing (lower/upper/title/mixed), and word order. Only independent uniform word picks contribute.

Implementation: `PassphraseGenerator::estimateEntropy()` in `core/PassphraseGenerator.cpp`.

### Character password entropy (zxcvbn)

KeePassXC does **not** use a naive `length * log2(alphabet)` formula. It runs the generated string through **zxcvbn**, which estimates the entropy an attacker needs when using smart guessing (dictionaries, keyboard patterns, dates, repeats, sequences) rather than pure brute force.

#### Step 1: Character cardinality (brute-force baseline)

`Cardinality()` scans the password and determines the alphabet size `C` from character classes present:

| Class | Contribution to C |
|-------|-------------------|
| Lowercase letters | +26 |
| Uppercase letters | +26 |
| Digits | +10 |
| ASCII punctuation | +33 |
| Other (Unicode) | +100 |

Brute-force entropy for a run of `L` characters (in natural log internally):

```
e_bf = L * ln(C)
```

#### Step 2: Pattern matches

The password is scanned for substrings matching:

- **Dictionary words** — base entropy `ln(rank)` where `rank` is the word's frequency rank in the embedded dictionary, plus extra terms for:
  - All-caps or single leading/trailing cap: `+ ln(2)` (1 bit)
  - Mixed caps: sum of binomial coefficients `C(n,k)` via `nCk()`
  - L33t substitutions: similar binomial counting
- **Spatial / keyboard patterns** — entropy based on keyboard layout and sequence length
- **Sequences** — incrementing/decrementing character runs
- **Repeats** — `base_entropy + ln(repeat_count)`
- **Dates / years** — entropy from year range (1901–2050) and date formats

#### Step 3: Minimum-entropy decomposition (Dijkstra)

The password is modeled as a graph: each character boundary is a node, and every candidate match (including single-character brute-force fallbacks) is an edge weighted by that match's entropy. zxcvbn runs **Dijkstra's shortest-path** algorithm to find the minimum-entropy way to compose the whole string:

```
H_nats = min over decompositions of ( sum of match entropies )
```

#### Step 4: Multi-match penalty

When a match is not at the very beginning of the password, a small constant is added (attacker must also guess where parts split):

| Position | Extra bits |
|----------|------------|
| End of password | +1.0 |
| Middle of password | +1.75 |

#### Step 5: Convert to bits

All internal math uses natural log (nats). The final result is:

```
H_bits = H_nats / ln(2) = log2(guesses)
```

#### Long passwords (>256 characters)

`PasswordHealth` feeds only the first 256 characters to zxcvbn (performance cap). For longer passwords, the per-character average of the first 256 is linearly extrapolated:

```
average = entropy_256 / 256
entropy = entropy_256 + average * (length - 256)
```

### Quality thresholds

From `PasswordHealth::quality()` in `core/PasswordHealth.cpp`:

| Entropy (bits) | Quality |
|----------------|---------|
| ≤ 0 | Bad |
| < 40 | Poor |
| < 75 | Weak |
| < 100 | Good |
| ≥ 100 | Excellent |

---

## File guide

### zxcvbn/ (pure C, no Qt)

| File | Purpose |
|------|---------|
| `zxcvbn.c` | Main algorithm: pattern matching, Dijkstra path search, entropy calculation |
| `zxcvbn.h` | Public API |
| `dict-src.h` | Embedded ranked-word dictionary trie (included at compile time when `USE_DICT_FILE` is undefined) |
| `CMakeLists.txt` | Reference build: static library `zxcvbn` |

**Public API:**

```c
// Returns entropy in bits. Pass null for UserDict and Info if not needed.
double ZxcvbnMatch(const char *Passwd, const char *UserDict[], ZxcMatch_t **Info);

// Free match info returned by ZxcvbnMatch (when Info was non-null)
void ZxcvbnFreeInfo(ZxcMatch_t *Info);
```

With the default build (`USE_DICT_FILE` undefined), dictionary init/shutdown are no-ops:

```c
#define ZxcvbnInit(s) 1
#define ZxcvbnUnInit() do {} while(0)
```

### core/ (KeePassXC wrappers, require Qt)

| File | Purpose |
|------|---------|
| `PasswordHealth.h` / `.cpp` | Wraps zxcvbn for character passwords; provides quality enum and score |
| `PassphraseGenerator.h` / `.cpp` | Passphrase generation and closed-form entropy estimate |

**Public API (entropy-relevant):**

```cpp
// Character password: runs zxcvbn, returns .entropy() in bits
PasswordHealth health(QString("MyP@ssw0rd!"));
double bits = health.entropy();
PasswordHealth::Quality q = health.quality();

// Passphrase: closed-form estimate
PassphraseGenerator gen;
gen.setWordList("path/to/eff_large.wordlist");
double bits = gen.estimateEntropy(7);  // 7 words
```

**Optional / database-specific (can be removed if only entropy is needed):**

- `HealthChecker` in `PasswordHealth.cpp` — evaluates password reuse and expiry against a KeePassXC `Database`. Requires `Clock.h`, `Group.h`, `Entry`, `Database`.

**PassphraseGenerator extras (not needed for entropy only):**

- `generatePassphrase()` requires `crypto/Random.h`
- `setDefaultWordList()` requires `core/Resources.h`

Point `setWordList()` at `wordlists/eff_large.wordlist` for the default EFF wordlist.

---

## Dependencies

### zxcvbn/

- C standard library + `libm` (link with `-lm`)
- No Qt, no external libraries
- Self-contained and reusable as-is

### core/PasswordHealth.*

- **Qt Core:** `QString`, `QObject::tr`, `QStringList`, `QSharedPointer`, `QDateTime`
- **For entropy only:** `PasswordHealth(const QString&)` constructor + `quality()` — needs Qt Core and zxcvbn
- **For HealthChecker:** additionally KeePassXC `Clock.h`, `Group.h`, `Entry`, `Database`

### core/PassphraseGenerator.*

- **Qt Core:** `QFile`, `QRegularExpression`, `QSet`, `QTextStream`, `QList`, `QString`
- **For entropy only:** `setWordList(path)` + `estimateEntropy()` — needs Qt Core only
- **For generation:** additionally `crypto/Random.h`, `core/Resources.h`

---

## Build / integration

### Standalone zxcvbn (CMake)

```cmake
add_subdirectory(entropy_calculation/zxcvbn)
target_link_libraries(your_target PRIVATE zxcvbn m)
target_include_directories(your_target PRIVATE entropy_calculation/zxcvbn)
```

Or manually:

```bash
gcc -c entropy_calculation/zxcvbn/zxcvbn.c -o zxcvbn.o
# Link with -lm
```

### Using zxcvbn directly (C)

```c
#include "zxcvbn.h"

double bits = ZxcvbnMatch("correct horse battery staple", NULL, NULL);
// bits ≈ entropy in bits
```

### Using KeePassXC wrappers (Qt project)

1. Add `entropy_calculation/zxcvbn` and `entropy_calculation/core` to your Qt project
2. Link zxcvbn and Qt Core
3. Ensure include paths resolve `#include "zxcvbn.h"` from `PasswordHealth.cpp`
4. For passphrase entropy, call `setWordList("entropy_calculation/wordlists/eff_large.wordlist")`

---

## Licenses

| Component | License | Copyright |
|-----------|---------|-----------|
| `zxcvbn/` (zxcvbn.c, zxcvbn.h, dict-src.h) | MIT | Tony Evans, 2015–2017 |
| `core/` (PasswordHealth, PassphraseGenerator) | GPLv2 or later (at your option, v3) | KeePassXC Team |
| `wordlists/eff_large.wordlist` | CC BY 3.0 | Electronic Frontier Foundation |

When combining these in another project, respect the license terms of each component. The KeePassXC wrapper files are GPL; zxcvbn is MIT.

---

## Origin

Extracted from [KeePassXC](https://github.com/keepassxreboot/keepassxc):

- `src/thirdparty/zxcvbn/` → `zxcvbn/`
- `src/core/PasswordHealth.*`, `PassphraseGenerator.*` → `core/`
- `share/wordlists/eff_large.wordlist` → `wordlists/`
