// ============================================================================
// المهام الليلية: تحديث أشهر عمليات البحث وفحص تنبيهات الأسعار
// كلاهما يخضع لسقف الرصيد اليومي نفسه الذي يخضع له بحث الزوار، دون أي استثناء.
// ============================================================================

/**
 * تحديث دفعة من أشهر عمليات البحث. يتوقف فور نفاد الرصيد اليومي.
 * @param {object} deps
 * @param {Array<{key:string, query:string, gov:string, section:string}>} deps.items
 * @param {(key:string) => Promise<number|null>} deps.cachedAgeMs
 * @param {number} deps.freshEnoughMs
 * @param {() => Promise<boolean>} deps.reserveCredits
 * @param {(item) => Promise<{providerOk:boolean}>} deps.runSearch
 */
export async function refreshPopularBatch({ items, cachedAgeMs, freshEnoughMs, reserveCredits, runSearch, log = console }) {
  const report = { refreshed: 0, skipped: 0, failed: 0, budgetExhausted: false };
  for (const item of items) {
    const age = await cachedAgeMs(item.key);
    if (age !== null && age < freshEnoughMs) {
      report.skipped += 1;
      continue;
    }
    if (!(await reserveCredits())) {
      report.budgetExhausted = true;
      break;
    }
    try {
      const payload = await runSearch(item);
      if (payload?.providerOk) report.refreshed += 1;
      else report.failed += 1;
    } catch (err) {
      log.error?.('nightly refresh failed for one query:', err.message);
      report.failed += 1;
    }
  }
  return report;
}

/**
 * فحص التنبيهات المستحقة. النتائج المحفوظة تُستخدم أولاً مجاناً.
 * إن تعذر البحث الجديد (نفاد الرصيد اليومي، أو بلوغ حد الليلة، أو فشل البحث)
 * لا يُعلَّم التنبيه مفحوصاً، فيبقى مستحقاً ويُعاد في المرة القادمة.
 * @returns {Promise<{checked:number, notified:number, fromCache:number, freshSearches:number, deferred:number, budgetExhausted:boolean}>}
 */
export async function checkDueAlerts({
  alerts,
  getPayload,
  canSearch,
  freshSearchAllowance,
  reserveCredits,
  runSearch,
  checkPayload,
  markChecked,
  log = console
}) {
  const report = { checked: 0, notified: 0, fromCache: 0, freshSearches: 0, deferred: 0, budgetExhausted: false };
  let allowance = freshSearchAllowance;

  for (const alert of alerts) {
    const payload = await getPayload(alert);
    if (payload) {
      report.fromCache += 1;
      report.checked += 1;
      report.notified += await checkPayload(payload, alert);
      // نتيجة محفوظة فارغة لا تعلّم التنبيه داخل الفحص، فنعلّمه هنا كي لا تتكرر الدفعة نفسها
      await markChecked(alert, []);
      continue;
    }
    if (!canSearch) {
      // لا يوجد مصدر بحث مدفوع أصلاً: لا فائدة من إعادة المحاولة
      report.checked += 1;
      await markChecked(alert, []);
      continue;
    }
    if (allowance <= 0 || report.budgetExhausted) {
      report.deferred += 1;
      continue;
    }
    if (!(await reserveCredits())) {
      report.budgetExhausted = true;
      report.deferred += 1;
      continue;
    }
    allowance -= 1;
    report.freshSearches += 1;
    try {
      // خط البحث يحفظ النتيجة ويفحص كل التنبيهات المطابقة لها، ومنها هذا التنبيه
      const result = await runSearch(alert);
      if (!result?.providerOk) {
        // المزود فشل أو أعاد نتيجة غير ناجحة: لا يُعدّ فحصاً، ويبقى التنبيه مستحقاً
        report.deferred += 1;
        continue;
      }
      report.checked += 1;
      // بحث ناجح بلا نتائج: يُعلَّم مفحوصاً كي لا يتكرر بلا نهاية
      await markChecked(alert, []);
    } catch (err) {
      log.error?.('alert fresh search failed:', err.message);
      report.deferred += 1;
    }
  }
  return { ...report, freshSearchAllowanceLeft: allowance };
}
