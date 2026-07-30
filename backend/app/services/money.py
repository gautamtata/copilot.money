from decimal import ROUND_HALF_EVEN, Decimal


def to_cents(amount: float | str | Decimal | None) -> int | None:
    """Convert a Plaid amount to integer cents, exactly once at the ingestion boundary."""
    if amount is None:
        return None
    return int((Decimal(str(amount)) * 100).to_integral_value(rounding=ROUND_HALF_EVEN))
