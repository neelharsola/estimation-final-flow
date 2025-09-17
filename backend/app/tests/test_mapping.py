from app.services.importer import _compute_row_id


def test_row_id_stability():
    row_a = {"platform": "Web", "module": "Auth", "component": "Login", "feature": "Email+Password"}
    row_b = {"platform": "web", "module": "auth ", "component": " login", "feature": " email+password "}
    assert _compute_row_id(row_a) == _compute_row_id(row_b)




