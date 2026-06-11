#!/usr/bin/env python3
"""
Send a push notification to one or more users and log it in the notifications table.

Usage:
  python3 scripts/send-push.py --user-id <uuid> --title "Title" --body "Body" [--url /path]
  python3 scripts/send-push.py --all --title "Title" --body "Body" [--url /path]
"""
import json, time, base64, urllib.request, urllib.parse, argparse, os

SUPABASE_URL   = "https://jccdmijicuisddtfunvr.supabase.co"
SUPABASE_KEY   = os.environ.get("SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjY2RtaWppY3Vpc2RkdGZ1bnZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQwMjI5MywiZXhwIjoyMDkyOTc4MjkzfQ.Y9yH60yf-1jWXWq9oIVjEbZuMIUnvi7dhj3wBf-9bSM")
SA_KEY_PATH    = os.path.expanduser("~/Documents/electricstate-5b4f7-0ed78de74f1b.json")
FIREBASE_PROJECT = "electricstate-5b4f7"
APP_URL        = "https://www.electricstate.app"
CRON_SECRET    = os.environ.get("CRON_SECRET", "")


def get_fcm_token():
    with open(SA_KEY_PATH) as f:
        sa = json.load(f)

    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.backends import default_backend

    def b64url(data):
        if isinstance(data, str): data = data.encode()
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

    now = int(time.time())
    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}))
    claims = b64url(json.dumps({
        "iss": sa["client_email"],
        "scope": "https://www.googleapis.com/auth/firebase.messaging",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now, "exp": now + 3600,
    }))
    private_key = serialization.load_pem_private_key(
        sa["private_key"].encode(), password=None, backend=default_backend()
    )
    sig = b64url(private_key.sign(f"{header}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256()))
    jwt = f"{header}.{claims}.{sig}"

    data = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=data)) as r:
        return json.loads(r.read())["access_token"]


def send_fcm(access_token, fcm_token, title, body, url=None):
    payload = {
        "message": {
            "token": fcm_token,
            "notification": {"title": title, "body": body},
            "apns": {"payload": {"aps": {"sound": "default", "badge": 1}}},
        }
    }
    if url:
        payload["message"]["data"] = {"url": url}

    req = urllib.request.Request(
        f"https://fcm.googleapis.com/v1/projects/{FIREBASE_PROJECT}/messages:send",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return True, json.loads(r.read()).get("name")
    except urllib.error.HTTPError as e:
        return False, e.read().decode()


def log_notification(user_id, title, body, url=None):
    """Log the notification to the in-app notifications table."""
    if not CRON_SECRET:
        print("  ⚠  CRON_SECRET not set — skipping in-app log")
        return
    payload = json.dumps({
        "user_id": user_id,
        "type": "push",
        "title": title,
        "body": body,
        "data": {"url": url} if url else {},
    }).encode()
    req = urllib.request.Request(
        f"{APP_URL}/api/notifications/log",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-internal-secret": CRON_SECRET,
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
            print(f"  📥 Logged to in-app feed: {result}")
    except Exception as e:
        print(f"  ⚠  Failed to log to in-app feed: {e}")


def get_users(user_id=None):
    url = f"{SUPABASE_URL}/rest/v1/profiles?fcm_token=not.is.null&select=id,display_name,fcm_token"
    if user_id:
        url += f"&id=eq.{user_id}"
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", help="Target a specific user UUID")
    parser.add_argument("--all", action="store_true", help="Send to all users with FCM tokens")
    parser.add_argument("--title", required=True)
    parser.add_argument("--body", required=True)
    parser.add_argument("--url", default=None, help="Deep-link URL e.g. /events/festival-xxx")
    args = parser.parse_args()

    users = get_users(args.user_id)
    if not users:
        print("No users found with FCM tokens")
        return

    print(f"Getting FCM access token...")
    access_token = get_fcm_token()

    for u in users:
        name = u.get("display_name") or u["id"]
        ok, result = send_fcm(access_token, u["fcm_token"], args.title, args.body, args.url)
        status = "✅" if ok else "❌"
        print(f"{status} {name}: {result}")
        if ok:
            log_notification(u["id"], args.title, args.body, args.url)


if __name__ == "__main__":
    main()
