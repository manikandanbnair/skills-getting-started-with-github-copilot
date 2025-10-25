from fastapi.testclient import TestClient
from src import app as app_module
import uuid

client = TestClient(app_module.app)


def unique_email():
    return f"test+{uuid.uuid4().hex}@example.local"


def test_get_activities_returns_dict():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # some known activity from seed data
    assert "Chess Club" in data


def test_signup_and_prevent_duplicate():
    activity = "Chess Club"
    email = unique_email()

    # signup should succeed
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # duplicate signup should fail with 400
    resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 400

    # cleanup
    resp_del = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_del.status_code == 200


def test_remove_participant_and_404_on_missing():
    activity = "Programming Class"
    email = unique_email()

    # ensure signup first
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200

    # now delete
    resp_del = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_del.status_code == 200
    assert "Removed" in resp_del.json().get("message", "")

    # deleting again should return 404
    resp_del2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_del2.status_code == 404
