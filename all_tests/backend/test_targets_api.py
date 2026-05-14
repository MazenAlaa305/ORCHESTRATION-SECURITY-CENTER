"""
Integration tests for /api/v1/targets/ — full CRUD lifecycle.
"""
import allure


# ── Helpers ────────────────────────────────────────────────────────────────────

def _create_target(client, headers, name="Test Target", url="http://target-api-test.local"):
    return client.post(
        "/api/v1/targets/",
        headers=headers,
        json={"name": name, "base_url": url, "auth_method": "none", "auth_credentials": {}},
    )


# ── Auth gate ─────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Authentication")
@allure.title("List targets requires authentication")
@allure.severity(allure.severity_level.BLOCKER)
def test_list_targets_requires_auth(client):
    r = client.get("/api/v1/targets/")
    assert r.status_code in (401, 403)


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Authentication")
@allure.title("Create target requires authentication")
@allure.severity(allure.severity_level.BLOCKER)
def test_create_target_requires_auth(client):
    r = client.post("/api/v1/targets/", json={"name": "x", "base_url": "http://x.local"})
    assert r.status_code in (401, 403)


# ── RBAC gate ─────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Authorization")
@allure.title("Viewer cannot create a target (403)")
@allure.severity(allure.severity_level.BLOCKER)
def test_viewer_cannot_create_target(client, viewer_headers):
    r = _create_target(client, viewer_headers, url="http://viewer-create.local")
    assert r.status_code == 403


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Authorization")
@allure.title("Analyst cannot create a target (403)")
@allure.severity(allure.severity_level.BLOCKER)
def test_analyst_cannot_create_target(client, analyst_headers):
    r = _create_target(client, analyst_headers, url="http://analyst-create.local")
    assert r.status_code == 403


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Authorization")
@allure.title("Viewer cannot delete a target (403)")
@allure.severity(allure.severity_level.BLOCKER)
def test_viewer_cannot_delete_target(client, admin_headers, viewer_headers):
    created = _create_target(client, admin_headers, url="http://viewer-delete.local")
    assert created.status_code in (200, 201)
    target_id = created.json()["id"]
    r = client.delete(f"/api/v1/targets/{target_id}", headers=viewer_headers)
    assert r.status_code == 403


# ── CREATE ────────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Create Target")
@allure.title("Admin creates a target successfully")
@allure.severity(allure.severity_level.CRITICAL)
def test_admin_creates_target_successfully(client, admin_headers):
    r = _create_target(client, admin_headers, name="My Target", url="http://create-success.local")
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["name"] == "My Target"
    assert body["base_url"] == "http://create-success.local"
    assert "id" in body


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Create Target")
@allure.title("Auth credentials are masked in the create response")
@allure.severity(allure.severity_level.CRITICAL)
def test_create_target_returns_masked_credentials(client, admin_headers):
    r = client.post(
        "/api/v1/targets/",
        headers=admin_headers,
        json={
            "name": "Masked Creds Target",
            "base_url": "http://masked-creds.local",
            "auth_method": "basic",
            "auth_credentials": {"username": "admin", "password": "secret"},
        },
    )
    assert r.status_code in (200, 201)
    body = r.json()
    assert body.get("auth_credentials") != {"username": "admin", "password": "secret"}


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Create Target")
@allure.title("Duplicate base URL is rejected with 400")
@allure.severity(allure.severity_level.NORMAL)
def test_create_duplicate_url_rejected(client, admin_headers):
    url = "http://dup-target.local"
    r1 = _create_target(client, admin_headers, url=url)
    assert r1.status_code in (200, 201)
    r2 = _create_target(client, admin_headers, url=url)
    assert r2.status_code == 400


# ── LIST ──────────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("List Targets")
@allure.title("List targets returns a list")
@allure.severity(allure.severity_level.NORMAL)
def test_list_targets_returns_list(client, admin_headers):
    r = client.get("/api/v1/targets/", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("List Targets")
@allure.title("Authenticated analyst can list targets")
@allure.severity(allure.severity_level.NORMAL)
def test_authenticated_user_can_list_targets(client, analyst_headers):
    r = client.get("/api/v1/targets/", headers=analyst_headers)
    assert r.status_code == 200


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("List Targets")
@allure.title("Pagination limit is respected in target list")
@allure.severity(allure.severity_level.NORMAL)
def test_list_targets_pagination(client, admin_headers):
    for i in range(3):
        _create_target(client, admin_headers, url=f"http://paginate-{i}.local")
    r = client.get("/api/v1/targets/?skip=0&limit=2", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 2


# ── GET by ID ─────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Get Target")
@allure.title("Get target by ID returns the correct target")
@allure.severity(allure.severity_level.NORMAL)
def test_get_target_by_id(client, admin_headers):
    created = _create_target(client, admin_headers, url="http://get-by-id.local")
    target_id = created.json()["id"]
    r = client.get(f"/api/v1/targets/{target_id}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["id"] == target_id


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Get Target")
@allure.title("Get non-existent target returns 404")
@allure.severity(allure.severity_level.NORMAL)
def test_get_nonexistent_target_returns_404(client, admin_headers):
    r = client.get("/api/v1/targets/00000000-0000-0000-0000-000000000000", headers=admin_headers)
    assert r.status_code == 404


# ── UPDATE ────────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Update Target")
@allure.title("Admin can update target name")
@allure.severity(allure.severity_level.NORMAL)
def test_admin_can_update_target(client, admin_headers):
    created = _create_target(client, admin_headers, name="Old Name", url="http://update-target.local")
    target_id = created.json()["id"]
    r = client.patch(
        f"/api/v1/targets/{target_id}",
        headers=admin_headers,
        json={"name": "New Name", "base_url": "http://update-target.local", "auth_method": "none", "auth_credentials": {}},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Update Target")
@allure.title("Update non-existent target returns 404")
@allure.severity(allure.severity_level.NORMAL)
def test_update_nonexistent_target_returns_404(client, admin_headers):
    r = client.patch(
        "/api/v1/targets/00000000-0000-0000-0000-000000000000",
        headers=admin_headers,
        json={"name": "X", "base_url": "http://ghost.local", "auth_method": "none", "auth_credentials": {}},
    )
    assert r.status_code == 404


# ── DELETE ────────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Delete Target")
@allure.title("Admin can delete a target and it no longer exists")
@allure.severity(allure.severity_level.NORMAL)
def test_admin_can_delete_target(client, admin_headers):
    created = _create_target(client, admin_headers, url="http://delete-me.local")
    target_id = created.json()["id"]
    r = client.delete(f"/api/v1/targets/{target_id}", headers=admin_headers)
    assert r.status_code in (200, 204)
    get_r = client.get(f"/api/v1/targets/{target_id}", headers=admin_headers)
    assert get_r.status_code == 404


@allure.epic("API")
@allure.feature("Targets Management")
@allure.story("Delete Target")
@allure.title("Delete non-existent target returns 404")
@allure.severity(allure.severity_level.NORMAL)
def test_delete_nonexistent_target_returns_404(client, admin_headers):
    r = client.delete("/api/v1/targets/00000000-0000-0000-0000-000000000000", headers=admin_headers)
    assert r.status_code == 404
