"""Non-destructive local ERP API smoke test.

The script intentionally leaves clearly named E2E records in the development
database so persistence can be verified after a restart or account switch.
"""

from __future__ import annotations

import io
import time
from pathlib import Path

import httpx


ROOT = Path(__file__).resolve().parents[1]
API = "http://127.0.0.1:8000/api/v1"


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"')
    return values


def check(name: str, condition: bool) -> None:
    print(f"{name} {'PASS' if condition else 'FAIL'}")
    if not condition:
        raise AssertionError(name)


def main() -> None:
    env = read_env(ROOT / "apps" / "frontend" / ".env.local")
    with httpx.Client(timeout=45) as client:
        def login(username: str, password: str) -> str:
            response = client.post(
                f"{API}/auth/login",
                data={"username": username, "password": password},
            )
            response.raise_for_status()
            return response.json()["access_token"]

        def headers(token: str) -> dict[str, str]:
            return {"Authorization": f"Bearer {token}"}

        def request(method: str, path: str, token: str | None = None, **kwargs):
            response = client.request(
                method,
                f"{API}{path}",
                headers=headers(token) if token else None,
                **kwargs,
            )
            if response.is_error:
                detail = response.text[:400]
                raise RuntimeError(f"{method} {path}: HTTP {response.status_code}: {detail}")
            return response

        admin_token = login(
            env["NEXT_PUBLIC_DEMO_ADMIN_EMAIL"],
            env["NEXT_PUBLIC_DEMO_ADMIN_PASSWORD"],
        )
        user_token = login(
            env["NEXT_PUBLIC_DEMO_USER_EMAIL"],
            env["NEXT_PUBLIC_DEMO_USER_PASSWORD"],
        )
        check("LOGIN_ADMIN", bool(admin_token))
        check("LOGIN_USER", bool(user_token))

        users = request("GET", "/auth/users", admin_token).json()
        assigned_user = next(
            item for item in users if item["email"] == env["NEXT_PUBLIC_DEMO_USER_EMAIL"]
        )
        check("ASSIGNEE_FOUND", bool(assigned_user.get("tenant_id")))

        stamp = str(int(time.time()))
        manager_email = f"erp.e2e.{stamp}@sismik.com"
        temporary_password = f"Temp!Erp{stamp}"
        manager_password = f"Ready!Erp{stamp}"
        manager = request(
            "POST",
            "/auth/users",
            admin_token,
            json={
                "email": manager_email,
                "password": temporary_password,
                "full_name": f"ERP E2E Yönetici {stamp}",
                "phone": f"+905{stamp}",
                "roles": ["manager"],
                "is_active": True,
                "tenant_id": assigned_user["tenant_id"],
            },
        ).json()
        check("MANAGER_CREATED", manager.get("default_role") == "admin")
        request(
            "POST",
            "/auth/complete-password-reset",
            json={
                "email": manager_email,
                "temporary_password": temporary_password,
                "new_password": manager_password,
            },
        )
        manager_token = login(manager_email, manager_password)
        check("LOGIN_MANAGER", bool(manager_token))

        projects = request("GET", "/projects?skip=0&limit=50", manager_token).json()
        check("STORE_FIRST_PAGE", len(projects) == 50)
        project = projects[0]

        work_order = request(
            "POST",
            "/work-orders",
            manager_token,
            json={
                "project_id": project["id"],
                "work_type": "fault",
                "title": f"E2E Kalıcılık Testi {stamp}",
                "description": "Yönetici-kullanıcı uçtan uca kalıcılık testi",
                "assigned_to_user_id": assigned_user["id"],
                "priority": "urgent",
                "due_date": "2026-09-15T12:00:00",
            },
        ).json()
        work_order_id = work_order["id"]
        check("WORK_ORDER_CREATED", bool(work_order_id))
        check("WORK_ORDER_PLANNED", work_order["status"] == "planned")
        check("WORK_ORDER_ASSIGNED", work_order["assigned_to_user_id"] == assigned_user["id"])

        png = io.BytesIO(
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDAT\x08\xd7c\xf8\xcf\xc0\xf0\x1f\x00\x05\x00\x01\xff\x89\x99=\x1d\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        file_tuple = (f"e2e-{stamp}.png", png.getvalue(), "image/png")
        before = request(
            "POST",
            f"/work-orders/{work_order_id}/photos",
            manager_token,
            data={"photo_type": "before"},
            files={"file": file_tuple},
        ).json()
        check("START_ATTACHMENT_UPLOAD", bool(before.get("id")))

        user_orders = request("GET", "/work-orders", user_token).json()
        check("USER_SEES_ASSIGNED_ORDER", any(item["id"] == work_order_id for item in user_orders))
        user_photos = request("GET", f"/work-orders/{work_order_id}/photos", user_token).json()
        check("USER_SEES_START_ATTACHMENT", any(item["id"] == before["id"] for item in user_photos))

        started = request(
            "PATCH",
            f"/work-orders/{work_order_id}",
            user_token,
            json={"status": "started"},
        ).json()
        check("USER_STARTED_ORDER", started["status"] == "started")

        report = request(
            "POST",
            f"/work-orders/{work_order_id}/reports",
            user_token,
            data={
                "title": f"E2E Saha Raporu {stamp}",
                "description": "Hesaplar arası rapor testi",
                "severity": "important",
            },
            files=[("files", file_tuple)],
        ).json()
        check("USER_REPORT_UPLOAD", report["photo_count"] == 1)
        stage_photo = request(
            "POST",
            f"/work-orders/{work_order_id}/photos",
            user_token,
            data={"photo_type": "issue"},
            files={"file": file_tuple},
        ).json()
        check("USER_STAGE_PHOTO_UPLOAD", bool(stage_photo.get("id")))

        manager_reports = request(
            "GET", f"/work-orders/{work_order_id}/reports", manager_token
        ).json()
        manager_photos = request(
            "GET", f"/work-orders/{work_order_id}/photos", manager_token
        ).json()
        check(
            "MANAGER_SEES_USER_REPORT",
            any(item["id"] == report["id"] and item["photo_count"] == 1 for item in manager_reports),
        )
        check(
            "MANAGER_SEES_USER_PHOTO",
            any(item["id"] == stage_photo["id"] for item in manager_photos),
        )

        archive = request(
            "POST",
            "/documents/archive/upload",
            manager_token,
            data={"doc_type": "other", "revision_note": "E2E kalıcılık"},
            files={"file": file_tuple},
        ).json()
        check("ARCHIVE_UPLOAD", bool(archive.get("id")))

        request("POST", "/auth/logout", manager_token)
        invalidated = client.get(f"{API}/auth/me", headers=headers(manager_token))
        check("LOGOUT_MANAGER_FIRST_SESSION", invalidated.status_code == 401)
        manager_token = login(manager_email, manager_password)
        archive_list = request("GET", "/documents/archive", manager_token).json()
        check("ARCHIVE_PERSISTS_AFTER_LOGIN", any(item["id"] == archive["id"] for item in archive_list))

        download = request("GET", f"/documents/{archive['id']}/download", manager_token).json()
        downloaded = client.get(download["url"])
        check("ARCHIVE_DOWNLOAD_PREVIEW", downloaded.status_code == 200 and len(downloaded.content) > 0)
        moved = request(
            "POST",
            f"/documents/archive/{archive['id']}/transfer",
            manager_token,
            json={"project_id": project["id"], "doc_type": "visual_inventory"},
        ).json()
        check("ARCHIVE_TRANSFER", moved["archive_status"] == "transferred")
        project_documents = request(
            "GET", f"/documents/project/{project['id']}", manager_token
        ).json()
        check(
            "STORE_SEES_TRANSFERRED_FILE",
            any(item["id"] == archive["id"] for item in project_documents),
        )

        for role, token in (
            ("ADMIN", admin_token),
            ("USER", user_token),
            ("MANAGER", manager_token),
        ):
            request("POST", "/auth/logout", token)
            protected = client.get(f"{API}/auth/me", headers=headers(token))
            check(f"LOGOUT_{role}", protected.status_code == 401)

        print(f"E2E_WORK_ORDER_ID {work_order_id}")
        print(f"E2E_ARCHIVE_ID {archive['id']}")


if __name__ == "__main__":
    main()
