from __future__ import annotations

from typing import List

from bson import ObjectId

from app.db.mongo import get_db
from app.models.estimation import Estimation
from app.models.pricing import PricingBreakdownItem, PricingCalcResponse


async def calculate_pricing(estimation_id: str) -> PricingCalcResponse:
    db = get_db()
    est_doc = await db.estimations.find_one({"_id": ObjectId(estimation_id)})
    if not est_doc:
        raise ValueError("Estimation not found")
    est = Estimation.model_validate({**est_doc, "_id": str(est_doc["_id"])})

    items: list[PricingBreakdownItem] = []
    total = 0.0

    # Simple strategy: pick latest versioned rate per role and region="default"
    for res in est.current_version.resources:
        rate_doc = await db.pricing_rates.find_one({"role": res.role, "region": "default"}, sort=[("version", -1)])
        if not rate_doc:
            continue
        day_rate = float(rate_doc["day_rate"])  # ensure float
        days = float(res.days) * float(res.count)
        cost = day_rate * days
        items.append(
            PricingBreakdownItem(
                role=res.role,
                region=rate_doc.get("region", "default"),
                days=days,
                rate=day_rate,
                currency=rate_doc.get("currency", "USD"),
                cost=cost,
            )
        )
        total += cost

    currency = items[0].currency if items else "USD"
    return PricingCalcResponse(items=items, total=total, currency=currency)


