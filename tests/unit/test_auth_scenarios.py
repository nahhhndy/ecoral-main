"""Comprehensive End-to-End Test Suite verifying TEST 1 through TEST 8 scenarios."""
import asyncio
import os
import sys
import time

from fastapi.testclient import TestClient

from backend.app.core.config import get_settings
from backend.app.db.session import create_tables
from backend.app.main import app

# Ensure tables are created
asyncio.run(create_tables())

client = TestClient(app)


def test_scenario_1_existing_user_login():
    """TEST 1: Existing valid account + correct password must successfully log in."""
    email = f"user_test1_{os.urandom(4).hex()}@ecoral.io"
    password = "CorrectPassword123!"

    # Create account
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Test One User",
        "password": password,
    })
    assert reg_res.status_code == 201

    # Login with existing valid account + correct password
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    assert login_res.status_code == 200
    tokens = login_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"


def test_scenario_2_wrong_password():
    """TEST 2: Existing account + wrong password must be rejected."""
    email = f"user_test2_{os.urandom(4).hex()}@ecoral.io"
    password = "CorrectPassword123!"

    # Create account
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Test Two User",
        "password": password,
    })
    assert reg_res.status_code == 201

    # Attempt login with wrong password
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword999!",
    })
    assert login_res.status_code == 401
    assert login_res.json()["detail"] == "Invalid email or password"


def test_scenario_3_new_signup():
    """TEST 3: Register completely new account -> succeeds -> sign out -> sign in with new account."""
    email = f"user_test3_{os.urandom(4).hex()}@ecoral.io"
    password = "NewSignupPassword123!"

    # 1. Register new account
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Test Three User",
        "password": password,
    })
    assert reg_res.status_code == 201
    reg_tokens = reg_res.json()
    assert "access_token" in reg_tokens

    # 2. Simulate Sign Out: In client architecture, sign out clears tokens.
    # We verify /me without token fails
    unauth_me = client.get("/api/v1/auth/me")
    assert unauth_me.status_code == 401

    # 3. Sign in using the newly created account
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    assert login_res.status_code == 200
    login_token = login_res.json()["access_token"]

    # 4. Verify authenticated session
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email


def test_scenario_4_duplicate_signup():
    """TEST 4: Attempt to register same account again must be rejected with clear error."""
    email = f"user_test4_{os.urandom(4).hex()}@ecoral.io"
    password = "Password123!"

    # 1. First registration
    first_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Duplicate User",
        "password": password,
    })
    assert first_res.status_code == 201

    # 2. Attempt duplicate registration
    dup_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Duplicate User Again",
        "password": password,
    })
    assert dup_res.status_code == 409
    assert dup_res.json()["detail"] == "Email already registered"


def test_scenario_5_forgot_password_and_login():
    """TEST 5: Forgot password flow -> set new password -> sign in with new password."""
    email = f"user_test5_{os.urandom(4).hex()}@ecoral.io"
    old_password = "InitialPassword123!"
    new_password = "UpdatedNewPassword456!"

    # 1. Register account
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Reset Flow User",
        "password": old_password,
    })
    assert reg_res.status_code == 201

    time.sleep(1.05)

    # 2. Complete reset flow
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "email": email,
        "new_password": new_password,
        "confirm_password": new_password,
    })
    assert reset_res.status_code == 200
    assert "Password changed successfully" in reset_res.json()["message"]

    # 3. Sign in using new password
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": new_password,
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # 4. Verify me with new token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email


def test_scenario_6_old_password_rejected():
    """TEST 6: After changing password, old password must no longer authenticate."""
    email = f"user_test6_{os.urandom(4).hex()}@ecoral.io"
    old_password = "OriginalPassword123!"
    new_password = "BrandNewPassword789!"

    # 1. Register account
    client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Old Password User",
        "password": old_password,
    })

    # 2. Reset password
    client.post("/api/v1/auth/reset-password", json={
        "email": email,
        "new_password": new_password,
        "confirm_password": new_password,
    })

    # 3. Attempt to authenticate using old password -> Must FAIL
    old_login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": old_password,
    })
    assert old_login_res.status_code == 401
    assert old_login_res.json()["detail"] == "Invalid email or password"


def test_scenario_7_refresh_and_persistence():
    """TEST 7: Newly created account persists across application reload / new client instance."""
    email = f"user_test7_{os.urandom(4).hex()}@ecoral.io"
    password = "PersistentPassword123!"

    # 1. Create account
    client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Persistent User",
        "password": password,
    })

    # 2. Simulate application restart: instantiate a completely new TestClient instance
    fresh_client = TestClient(app)

    # 3. The account must still exist and authenticate in the new instance
    login_res = fresh_client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    refresh_token = login_res.json()["refresh_token"]

    # 4. Token refresh must work
    refresh_res = fresh_client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()


def test_scenario_8_error_handling():
    """TEST 8: Error handling for nonexistent account, invalid password, mismatch, empty fields."""
    # 1. Nonexistent account login
    res_no_user = client.post("/api/v1/auth/login", json={
        "email": "definitely_does_not_exist@ecoral.io",
        "password": "Password123!",
    })
    assert res_no_user.status_code == 401
    assert res_no_user.json()["detail"] == "Invalid email or password"

    # 2. Nonexistent account password reset
    res_no_reset = client.post("/api/v1/auth/reset-password", json={
        "email": "definitely_does_not_exist@ecoral.io",
        "new_password": "NewPassword123!",
        "confirm_password": "NewPassword123!",
    })
    assert res_no_reset.status_code == 404
    assert "No account found" in res_no_reset.json()["detail"]

    # 3. Password mismatch in reset
    res_mismatch = client.post("/api/v1/auth/reset-password", json={
        "email": "test@ecoral.io",
        "new_password": "NewPassword123!",
        "confirm_password": "MismatchPassword456!",
    })
    assert res_mismatch.status_code == 422

    # 4. Password shorter than 8 chars in signup
    res_short = client.post("/api/v1/auth/register", json={
        "email": "short@ecoral.io",
        "full_name": "Short Pass User",
        "password": "123",
    })
    assert res_short.status_code == 422

    # 5. Empty required full_name in signup
    res_empty_name = client.post("/api/v1/auth/register", json={
        "email": "noname@ecoral.io",
        "full_name": "   ",
        "password": "ValidPassword123!",
    })
    assert res_empty_name.status_code == 422

    # 6. Invalid email format
    res_bad_email = client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "full_name": "Bad Email User",
        "password": "ValidPassword123!",
    })
    assert res_bad_email.status_code == 422
