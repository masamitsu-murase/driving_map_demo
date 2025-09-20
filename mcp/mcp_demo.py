import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Demo")
URL = "http://localhost:9000/api/set_next_action"


@mcp.tool()
def get_target_places() -> list[dict]:
    """
    Retrieve target places from the driving simulator, sorted by distance ascending.

    Returns a list of target places sorted by the 'distance' key.

    Returns:
        list[dict]:
            List of target dictionaries, each containing:
                - id (int): Target ID
                - lat (float): Latitude
                - lng (float): Longitude
                - distance (float): Distance to the target
                - status (str): Status of the target
            The list is sorted in ascending order by 'distance'.
    """
    payload = {"action": "get_all_targets"}
    response = httpx.post(URL, json=payload)
    response.raise_for_status()
    data = response.json()
    targets = data.get("targets", [])
    return targets


@mcp.tool()
def go_to_nearest():
    """
    Move towards the nearest target to your vehicle (for driving simulator).
    """
    payload = {"action": "go_to_nearest"}
    response = httpx.post(URL, json=payload)
    response.raise_for_status()


@mcp.tool()
def go_to_target(target_id: int):
    """
    Move towards the target specified by target_id (for driving simulator).
    """
    payload = {
        "action": "go_to_target",
        "target": target_id,
    }
    response = httpx.post(URL, json=payload)
    response.raise_for_status()


if __name__ == "__main__":
    mcp.run()
