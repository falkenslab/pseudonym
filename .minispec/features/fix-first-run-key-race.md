# False "key missing" when programs start at once

Issue: [#7](https://github.com/falkenslab/pseudonym/issues/7)

## Problem

Two or more processes using the library for the first time at the same moment: one of them can fail with `PseudonymError: The key in … is missing, but one was used there before`, although the key was just created and nothing was lost. Seen once in about 20 full test runs under load (the test that starts several processes creating the key), in 0.1.0.

## Cause

`loadKey()` reads the key, finds none, then checks the `used` marker. Between those two steps another process can link the key into place and write the marker: the first process sees the marker, takes the missing key for a lost one, and fails closed.

## Solution

`src/home.ts`: when the marker exists, read the key again before refusing. The creating process links the key before it writes the marker, so with the marker present the key is either there or really lost. The concurrent-creation test starts 10 processes instead of 6.

## Verification

Before the fix: 1 failure in 12 full suites run two at a time. After it: 0 in 16, and the suite passes in single runs.
