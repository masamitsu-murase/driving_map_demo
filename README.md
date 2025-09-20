# Driving MCP demo

## How to use

1. Download osrm-backend from [GitHub Page](https://github.com/Project-OSRM/osrm-backend/releases/download/v5.27.0/node_osrm-v5.27.0-node-v93-win32-x64-Release.tar.gz) .
1. Extract it in `osrm_kyoto` directory.  
   You can find `osrm_kyoto/binding/osrm-routed.exe`.
1. Run `osrm_kyoto\run.cmd`.

1. In `mcp` directory, generate venv environment and run `pip install -r requirements.txt`.
1. Run `python mcp_demp.py`.  
   You can access to the MCP server as "http://localhost:8080/sse".

1. Run `python app.py`. You may need requests library.
