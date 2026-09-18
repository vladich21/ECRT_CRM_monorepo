export type PurchaseMethodThresholdInput = {
  id: string;
  code: string;
  name: string;
  amount_from_kopecks: number | null;
  amount_to_kopecks: number | null;
  vat_base: string;
};

export type EvaluatedPurchaseMethod = PurchaseMethodThresholdInput & {
  compare_kopecks: number;
  in_threshold: boolean;
  allowed: boolean;
  requires_justification: boolean;
};

export function isAmountInThreshold(
  amountKopecks: number,
  fromKopecks: number | null,
  toKopecks: number | null,
): boolean {
  if (fromKopecks != null && amountKopecks <= fromKopecks) return false;
  if (toKopecks != null && amountKopecks > toKopecks) return false;
  return true;
}

/** ОВ-46: порог сравнивает либо нетто, либо гросс — как написано в строке справочника. */
export function amountKopecksForVatBase(
  vatBase: string,
  netKopecks: number,
  grossKopecks: number,
): number {
  return vatBase === 'gross' ? grossKopecks : netKopecks;
}

/**
 * БП-2: сумма выше всех закрытых верхних границ — нельзя взять «нижний» способ даже с текстом.
 * На сиде это > 500_000 нетто → только комиссия.
 */
export function isAboveClosedCap(
  methods: PurchaseMethodThresholdInput[],
  netKopecks: number,
  grossKopecks: number,
): boolean {
  const finite = methods.filter(method => method.amount_to_kopecks != null);
  if (finite.length === 0) return false;
  return finite.every(
    method =>
      amountKopecksForVatBase(method.vat_base, netKopecks, grossKopecks) > (method.amount_to_kopecks as number),
  );
}

export function evaluatePurchaseMethods(
  methods: PurchaseMethodThresholdInput[],
  netKopecks: number | null,
  grossKopecks: number | null,
): EvaluatedPurchaseMethod[] {
  // БП-33: НМЦД может быть не обоснована ни одним методом (price_method = 'impossible') —
  // сравнивать с порогом нечего. БП-2 по духу: сумма не доказана «ниже потолка»,
  // поэтому допустим только способ без верхней границы (закупочная комиссия).
  if (netKopecks == null || grossKopecks == null) {
    return methods.map(method => {
      const allowed = method.amount_to_kopecks == null;
      return {
        ...method,
        compare_kopecks: 0,
        in_threshold: false,
        allowed,
        requires_justification: allowed,
      };
    });
  }

  const aboveCap = isAboveClosedCap(methods, netKopecks, grossKopecks);
  return methods.map(method => {
    const compare_kopecks = amountKopecksForVatBase(method.vat_base, netKopecks, grossKopecks);
    const in_threshold = isAmountInThreshold(
      compare_kopecks,
      method.amount_from_kopecks,
      method.amount_to_kopecks,
    );
    const allowed = in_threshold || !aboveCap;
    return {
      ...method,
      compare_kopecks,
      in_threshold,
      allowed,
      requires_justification: allowed && !in_threshold,
    };
  });
}

export function purchaseMethodSelectError(
  method: EvaluatedPurchaseMethod,
  justification: string | null,
): 'forbidden' | 'need_justification' | null {
  if (!method.allowed) return 'forbidden';
  if (method.requires_justification && !justification?.trim()) return 'need_justification';
  return null;
}
