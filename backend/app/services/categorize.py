"""Deterministic categorization: user > rules > Plaid's personal finance category."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, CategoryRule

# Copilot-style default categories, seeded by migration. Order = sidebar order.
DEFAULT_CATEGORIES: list[dict] = [
    {"name": "Income", "emoji": "💰", "is_income": True},
    {"name": "Transfers", "emoji": "🔁", "exclude_from_budget": True},
    {"name": "Credit Card Payment", "emoji": "💳", "exclude_from_budget": True},
    {"name": "Groceries", "emoji": "🛒"},
    {"name": "Restaurants", "emoji": "🍽️"},
    {"name": "Shopping", "emoji": "🛍️"},
    {"name": "Entertainment", "emoji": "🎬"},
    {"name": "Subscriptions", "emoji": "📺"},
    {"name": "Transport", "emoji": "🚗"},
    {"name": "Travel", "emoji": "✈️"},
    {"name": "Housing", "emoji": "🏠"},
    {"name": "Home Improvement", "emoji": "🔨"},
    {"name": "Medical", "emoji": "🏥"},
    {"name": "Personal Care", "emoji": "💅"},
    {"name": "Services", "emoji": "🧾"},
    {"name": "Fees", "emoji": "🏦"},
    {"name": "Government & Nonprofit", "emoji": "🏛️"},
    {"name": "Other", "emoji": "🤷"},
]

# Plaid personal_finance_category detailed values that override the primary mapping.
PFC_DETAILED_TO_CATEGORY = {
    "FOOD_AND_DRINK_GROCERIES": "Groceries",
    "ENTERTAINMENT_TV_AND_MOVIES": "Subscriptions",
    "ENTERTAINMENT_MUSIC_AND_AUDIO": "Subscriptions",
}

PFC_PRIMARY_TO_CATEGORY = {
    "INCOME": "Income",
    "TRANSFER_IN": "Transfers",
    "TRANSFER_OUT": "Transfers",
    "LOAN_PAYMENTS": "Credit Card Payment",
    "BANK_FEES": "Fees",
    "ENTERTAINMENT": "Entertainment",
    "FOOD_AND_DRINK": "Restaurants",
    "GENERAL_MERCHANDISE": "Shopping",
    "HOME_IMPROVEMENT": "Home Improvement",
    "RENT_AND_UTILITIES": "Housing",
    "MEDICAL": "Medical",
    "PERSONAL_CARE": "Personal Care",
    "GENERAL_SERVICES": "Services",
    "GOVERNMENT_AND_NON_PROFIT": "Government & Nonprofit",
    "TRANSPORTATION": "Transport",
    "TRAVEL": "Travel",
    "OTHER": "Other",
}


class Categorizer:
    """Loads rules and category ids once, then categorizes transactions in memory."""

    def __init__(self, rules: list[CategoryRule], category_ids_by_name: dict[str, uuid.UUID]):
        self._rules = sorted(rules, key=lambda r: r.priority)
        self._by_name = category_ids_by_name

    @classmethod
    async def load(cls, session: AsyncSession) -> "Categorizer":
        rules = (await session.execute(select(CategoryRule))).scalars().all()
        categories = (await session.execute(select(Category))).scalars().all()
        return cls(list(rules), {c.name: c.id for c in categories})

    def match_rule(self, merchant_name: str | None, name: str) -> uuid.UUID | None:
        for candidate in filter(None, (merchant_name, name)):
            haystack = candidate.lower().strip()
            for rule in self._rules:
                pattern = rule.merchant_pattern.lower().strip()
                if (rule.match_type == "exact" and haystack == pattern) or (
                    rule.match_type == "contains" and pattern in haystack
                ):
                    return rule.category_id
        return None

    def match_pfc(self, primary: str | None, detailed: str | None) -> uuid.UUID | None:
        name = PFC_DETAILED_TO_CATEGORY.get(detailed or "") or PFC_PRIMARY_TO_CATEGORY.get(
            primary or ""
        )
        return self._by_name.get(name) if name else None

    def categorize(
        self, merchant_name: str | None, name: str, pfc_primary: str | None, pfc_detailed: str | None
    ) -> tuple[uuid.UUID | None, str]:
        """Returns (category_id, categorized_by)."""
        if rule_match := self.match_rule(merchant_name, name):
            return rule_match, "rule"
        if pfc_match := self.match_pfc(pfc_primary, pfc_detailed):
            return pfc_match, "plaid"
        return None, "none"
