import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Category, CategoryRule, Transaction
from app.schemas.transactions import (
    CategoryCreate,
    CategoryOut,
    CategoryPatch,
    RuleApplyResult,
    RuleCreate,
    RuleOut,
)

router = APIRouter(tags=["categories"])


@router.get("/categories")
async def list_categories(session: AsyncSession = Depends(get_session)) -> list[CategoryOut]:
    categories = (
        (await session.execute(select(Category).order_by(Category.sort_order, Category.name)))
        .scalars()
        .all()
    )
    return [CategoryOut.model_validate(c) for c in categories]


@router.post("/categories", status_code=201)
async def create_category(
    body: CategoryCreate, session: AsyncSession = Depends(get_session)
) -> CategoryOut:
    max_sort = await session.scalar(select(func.max(Category.sort_order))) or 0
    category = Category(**body.model_dump(), sort_order=max_sort + 1)
    session.add(category)
    await session.commit()
    return CategoryOut.model_validate(category)


@router.patch("/categories/{category_id}")
async def patch_category(
    category_id: uuid.UUID, body: CategoryPatch, session: AsyncSession = Depends(get_session)
) -> CategoryOut:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(404, "Unknown category")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    await session.commit()
    return CategoryOut.model_validate(category)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(404, "Unknown category")
    if category.is_system:
        raise HTTPException(400, "System categories can be renamed but not deleted")
    await session.delete(category)
    await session.commit()


@router.get("/category_rules")
async def list_rules(session: AsyncSession = Depends(get_session)) -> list[RuleOut]:
    rules = (
        (
            await session.execute(
                select(CategoryRule).order_by(CategoryRule.priority, CategoryRule.created_at)
            )
        )
        .scalars()
        .all()
    )
    return [RuleOut.model_validate(r) for r in rules]


@router.post("/category_rules", status_code=201)
async def create_rule(
    body: RuleCreate, session: AsyncSession = Depends(get_session)
) -> RuleApplyResult:
    if body.match_type not in ("exact", "contains"):
        raise HTTPException(400, "match_type must be 'exact' or 'contains'")
    rule = CategoryRule(**body.model_dump(exclude={"apply_to_existing"}))
    session.add(rule)
    await session.flush()

    applied = 0
    if body.apply_to_existing:
        pattern = rule.merchant_pattern.strip()
        if rule.match_type == "exact":
            match = func.lower(func.trim(Transaction.merchant_name)) == pattern.lower()
            name_match = func.lower(func.trim(Transaction.name)) == pattern.lower()
        else:
            match = Transaction.merchant_name.ilike(f"%{pattern}%")
            name_match = Transaction.name.ilike(f"%{pattern}%")
        result = await session.execute(
            update(Transaction)
            .where(
                Transaction.deleted_at.is_(None),
                Transaction.categorized_by != "user",  # user assignments are sacred
                match | name_match,
            )
            .values(category_id=rule.category_id, categorized_by="rule")
        )
        applied = result.rowcount or 0

    await session.commit()
    return RuleApplyResult(rule=RuleOut.model_validate(rule), retroactively_categorized=applied)


@router.delete("/category_rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> None:
    rule = await session.get(CategoryRule, rule_id)
    if rule is None:
        raise HTTPException(404, "Unknown rule")
    await session.delete(rule)
    await session.commit()
