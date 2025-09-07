from flask import Flask, request, send_from_directory
import json
from threading import Lock, Condition
import time


app = Flask(__name__)

status = {}
pending_action_lock = Lock()
pending_action_cond = Condition(pending_action_lock)
pending_action = None

@app.route("/api/set_next_action", methods=["POST"])
def set_next_action():
    global status, pending_action
    try:
        data = request.get_json(force=True)
    except Exception:
        return {"error": "Invalid JSON"}, 400
    action = data.get("action")
    if action == "go_to_nearest":
        with pending_action_lock:
            pending_action = {
                "type": "go_to_nearest",
            }
            pending_action_cond.notify_all()
        return {"success": True}
    elif action == "go_to_target":
        target_id = data.get("target")
        if target_id is None:
            return {"error": "Missing target"}, 400
        if target_id not in [t["id"] for t in status.get("targets", [])]:
            return {"error": "Unknown target"}, 400
        with pending_action_lock:
            pending_action = {
                "type": "go_to_target",
                "target": target_id
            }
            pending_action_cond.notify_all()
        return {"success": True}
    elif action == "get_all_targets":
        targets = sorted(status.get("targets", []), key=lambda t: t["distance"])
        return {"targets": targets}
    else:
        return {"error": "Unknown action"}, 400


@app.route("/api/get_next_action")
def get_next_action():
    global status, pending_action
    body = request.args.get("body")
    status = json.loads(body)
    with pending_action_lock:
        start_time = time.time()
        while pending_action is None:
            wait_time = 20 - (time.time() - start_time)
            if wait_time <= 0:
                break
            pending_action_cond.wait(timeout=wait_time)
        action_to_return = pending_action
        pending_action = None
    if action_to_return is None:
        return {"action": None}
    elif action_to_return["type"] == "go_to_nearest":
        return {"action": "go"}
    elif action_to_return["type"] == "go_to_target":
        return {"action": "go", "target": action_to_return["target"]}
    else:
        return {"error": "Unknown action"}, 400


@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('static_files', filename)


if __name__ == '__main__':
    app.run(debug=False, port=9000, host="127.0.0.1")
