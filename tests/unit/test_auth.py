"""Dedicated automated unit tests for authentication, tokens, user profile, and error scenarios."""
from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_auth_registration_and_login_flow():
    test_email = f"authtest_{os.urandom(4).hex()}@ecoral.io"
    test_password = "EcoRalTestPassword123!"

    # 1. Register new user
    reg_res = client.post("/api/v1/auth/register", json={
        "email": test_email,
        "full_name": "Auth Test User",
        "password": test_password
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    tokens = reg_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

    # 2. Login with valid credentials
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_tokens = login_res.json()
    assert "access_token" in login_tokens
    access_token = login_tokens["access_token"]
    refresh_token = login_tokens["refresh_token"]

    # 3. GET /api/v1/auth/me with valid Bearer token
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200, f"/auth/me failed: {me_res.text}"
    me_data = me_res.json()
    assert me_data["email"] == test_email
    assert me_data["full_name"] == "Auth Test User"
    assert me_data["is_active"] is True

    # 4. Token Refresh
    refresh_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    assert "access_token" in new_tokens


def test_auth_invalid_password():
    test_email = f"authtest_badpass_{os.urandom(4).hex()}@ecoral.io"
    client.post("/api/v1/auth/register", json={
        "email": test_email,
        "full_name": "Bad Pass User",
        "password": "CorrectPassword123!"
    })

    login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": "WrongPassword123!"
    })
    assert login_res.status_code == 401
    data = login_res.json()
    assert data["detail"] == "Invalid email or password"


def test_auth_nonexistent_user():
    login_res = client.post("/api/v1/auth/login", json={
        "email": f"nonexistent_{os.urandom(4).hex()}@ecoral.io",
        "password": "SomePassword123!"
    })
    assert login_res.status_code == 401
    data = login_res.json()
    assert data["detail"] == "Invalid email or password"


def test_auth_unauthenticated_me():
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_auth_duplicate_registration():
    dup_email = f"authtest_dup_{os.urandom(4).hex()}@ecoral.io"
    client.post("/api/v1/auth/register", json={
        "email": dup_email,
        "full_name": "First Registration",
        "password": "Password123!"
    })

    second_reg = client.post("/api/v1/auth/register", json={
        "email": dup_email,
        "full_name": "Second Registration",
        "password": "Password123!"
    })
    assert second_reg.status_code == 409
    assert "Email already registered" in second_reg.json()["detail"]


def test_auth_password_reset_flow():
    import time
    test_email = f"authtest_reset_{os.urandom(4).hex()}@ecoral.io"
    old_password = "OldEcoRalPassword123!"
    new_password = "NewEcoRalPassword456!"

    # 1. Register user
    reg_res = client.post("/api/v1/auth/register", json={
        "email": test_email,
        "full_name": "Reset Test User",
        "password": old_password,
    })
    assert reg_res.status_code == 201
    old_token = reg_res.json()["access_token"]

    # Sleep 1s to ensure timestamp boundary for session invalidation
    time.sleep(1.05)

    # 2. Reset password
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "email": test_email,
        "new_password": new_password,
        "confirm_password": new_password,
    })
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert "Password changed successfully" in reset_data["message"]

    # 3. Old session token must be invalidated
    old_headers = {"Authorization": f"Bearer {old_token}"}
    me_res = client.get("/api/v1/auth/me", headers=old_headers)
    assert me_res.status_code == 401
    assert "Session invalidated" in me_res.json()["detail"]

    # 4. Old password must no longer authenticate
    bad_login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": old_password,
    })
    assert bad_login_res.status_code == 401
    assert bad_login_res.json()["detail"] == "Invalid email or password"

    # 5. New password must authenticate successfully
    good_login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": new_password,
    })
    assert good_login_res.status_code == 200
    new_token = good_login_res.json()["access_token"]

    # 6. /auth/me with new token must succeed
    new_headers = {"Authorization": f"Bearer {new_token}"}
    new_me_res = client.get("/api/v1/auth/me", headers=new_headers)
    assert new_me_res.status_code == 200
    assert new_me_res.json()["email"] == test_email


def test_auth_password_reset_nonexistent_user():
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "email": f"nonexistent_{os.urandom(4).hex()}@ecoral.io",
        "new_password": "ValidNewPassword123!",
        "confirm_password": "ValidNewPassword123!",
    })
    assert reset_res.status_code == 404
    assert "No account found" in reset_res.json()["detail"]


def test_auth_password_reset_validation():
    # Password too short (< 8 chars)
    short_res = client.post("/api/v1/auth/reset-password", json={
        "email": "any@ecoral.io",
        "new_password": "short",
        "confirm_password": "short",
    })
    assert short_res.status_code == 422

    # Password mismatch
    mismatch_res = client.post("/api/v1/auth/reset-password", json={
        "email": "any@ecoral.io",
        "new_password": "ValidPassword123!",
        "confirm_password": "DifferentPassword456!",
    })
    assert mismatch_res.status_code == 422


def test_auth_verify_account():
    test_email = f"authtest_verify_{os.urandom(4).hex()}@ecoral.io"
    client.post("/api/v1/auth/register", json={
        "email": test_email,
        "full_name": "Verify User",
        "password": "Password123!",
    })

    # Existing account
    res = client.get(f"/api/v1/auth/verify-account?email={test_email}")
    assert res.status_code == 200
    assert res.json()["exists"] is True

    # Nonexistent account
    res_none = client.get("/api/v1/auth/verify-account?email=doesnotexist@ecoral.io")
    assert res_none.status_code == 404

