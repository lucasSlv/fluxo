/**
 * Enumerações de domínio sem dependências (seguras para Client Components).
 * Os models Mongoose reexportam daqui.
 */
export const ACCOUNT_TYPES = ["checking", "savings", "cash", "wallet", "investment"] as const;
export const TX_KINDS = ["income", "expense", "transfer", "card_payment", "savings_deposit", "savings_withdrawal"] as const;
export const TX_STATUS = ["pending", "paid", "cancelled"] as const;
export const PAYMENT_METHODS = ["pix", "debit", "credit", "cash", "boleto", "transfer", "other"] as const;
export const FREQUENCIES = ["weekly", "monthly", "quarterly", "semiannual", "annual"] as const;
export const DEBT_KINDS = ["loan", "financing", "installment_purchase", "personal", "agreement", "other"] as const;

export type TxKind = (typeof TX_KINDS)[number];
export type TxStatus = (typeof TX_STATUS)[number];
export type Frequency = (typeof FREQUENCIES)[number];
