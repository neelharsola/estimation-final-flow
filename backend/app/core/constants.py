from __future__ import annotations

"""
Centralized constants and helpers for the backend.

Roles:
- Admin
- Estimator
- Ops

Client sends roles normalized to lowercase via AuthContext, backend persists title-case.
"""

# Canonical role names as stored in DB / User models
ROLE_ADMIN = "Admin"
ROLE_ESTIMATOR = "Estimator"
ROLE_OPS = "Ops"

ALL_ROLES = {ROLE_ADMIN, ROLE_ESTIMATOR, ROLE_OPS}

# Mapping of possible legacy/lowercase inputs to canonical roles
ROLE_NORMALIZATION_MAP = {
    "admin": ROLE_ADMIN,
    "estimator": ROLE_ESTIMATOR,
    "ops": ROLE_OPS,
    # Legacy mappings
    "viewer": ROLE_OPS,  # migrate old Viewer to Ops
    "reviewer": ROLE_OPS,
}


def to_canonical_role(role: str) -> str:
    """Normalize arbitrary role strings to canonical role names.

    Falls back to given role if not known.
    """
    if not role:
        return ROLE_ESTIMATOR
    return ROLE_NORMALIZATION_MAP.get(str(role).strip().lower(), role)


