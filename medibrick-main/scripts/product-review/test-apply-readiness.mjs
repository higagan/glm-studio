/**
 * Unit checks for apply-readiness (mirrors src/lib/apply-readiness.ts).
 * Usage: node scripts/product-review/test-apply-readiness.mjs
 */
import assert from "node:assert/strict";

const APPLY_READY_KEY = "mb_apply_onboarding_ready";
const store = new Map();

function setPersisted(key, value) {
  store.set(`l:${key}`, value);
  store.set(`s:${key}`, value);
}
function getPersisted(key) {
  return store.get(`l:${key}`) ?? store.get(`s:${key}`) ?? null;
}
function removePersisted(key) {
  store.delete(`l:${key}`);
  store.delete(`s:${key}`);
}

function shouldResumeApply(jobId, applyParam) {
  if (applyParam === "resume") return true;
  return getPersisted("mb_pending_apply") === jobId;
}

function markApplyOnboardingReady() {
  setPersisted(APPLY_READY_KEY, "1");
}
function isApplyOnboardingReady() {
  return getPersisted(APPLY_READY_KEY) === "1";
}
function clearApplyOnboardingReady() {
  removePersisted(APPLY_READY_KEY);
}
function shouldBypassProfileGateForApply(jobId, applyParam) {
  if (shouldResumeApply(jobId, applyParam)) return true;
  if (isApplyOnboardingReady()) return true;
  return false;
}
function canOpenApplyDialog(profileCompletion, jobId, applyParam) {
  return profileCompletion >= 70 || shouldBypassProfileGateForApply(jobId, applyParam);
}

const jobId = "job-123";
store.clear();

assert.equal(canOpenApplyDialog(67, jobId, null), false);
assert.equal(canOpenApplyDialog(67, jobId, "resume"), true);
markApplyOnboardingReady();
assert.equal(canOpenApplyDialog(67, jobId, null), true);
clearApplyOnboardingReady();
assert.equal(canOpenApplyDialog(80, jobId, null), true);

console.log("test-apply-readiness: all passed");
