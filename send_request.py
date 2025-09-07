import requests
from pprint import pprint


BASE_URL = "http://localhost:9000"


def go_to_nearest():
    url = f"{BASE_URL}/api/set_next_action"
    payload = {
        "action": "go_to_nearest"
    }
    response = requests.post(url, json=payload)
    return response.json()


def go_to_target(id):
    url = f"{BASE_URL}/api/set_next_action"
    payload = {
        "action": "go_to_target",
        "target": id,
    }
    response = requests.post(url, json=payload)
    return response.json()


def get_all_targets():
    url = f"{BASE_URL}/api/set_next_action"
    payload = {
        "action": "get_all_targets",
    }
    response = requests.post(url, json=payload)
    return response.json()


if __name__ == "__main__":
    # pprint(go_to_nearest())
    pprint(go_to_target(4))
    # pprint(get_all_targets())
